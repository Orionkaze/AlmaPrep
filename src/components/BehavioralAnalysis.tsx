"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface BehavioralAnalysisProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  sessionId: string;
  onIntervalMetrics: (metrics: {
    interval_index: number;
    eye_contact_percent: number;
    posture_stability_score: number;
    facial_engagement: "nodding" | "neutral" | "distracted";
    fidgeting_count: number;
  }) => void;
  onActiveStatusChange: (active: boolean) => void;
  onFaceCountChange?: (count: number) => void;
}

export default function BehavioralAnalysis({
  videoRef,
  sessionId,
  onIntervalMetrics,
  onActiveStatusChange,
  onFaceCountChange,
}: BehavioralAnalysisProps) {
  const [scriptsLoaded, setScriptsLoaded] = useState({
    faceMesh: false,
    pose: false,
  });

  const faceMeshRef = useRef<any>(null);
  const poseRef = useRef<any>(null);
  const loopActiveRef = useRef<boolean>(false);
  const intervalIndexRef = useRef<number>(0);

  // Aggregation state for 30s intervals
  const frameMetricsRef = useRef<{
    eyeContactFrames: number;
    totalFrames: number;
    shoulderMidpoints: { x: number; y: number }[];
    shoulderAngles: number[];
    noddingDetections: number;
    distractedDetections: number;
    fidgetingDetections: number;
    lastNoseY: number | null;
    noseYHistory: number[];
    lastWristPos: { left: { x: number; y: number } | null; right: { x: number; y: number } | null };
  }>({
    eyeContactFrames: 0,
    totalFrames: 0,
    shoulderMidpoints: [],
    shoulderAngles: [],
    noddingDetections: 0,
    distractedDetections: 0,
    fidgetingDetections: 0,
    lastNoseY: null,
    noseYHistory: [],
    lastWristPos: { left: null, right: null },
  });

  // Load status sync
  useEffect(() => {
    if (scriptsLoaded.faceMesh && scriptsLoaded.pose) {
      onActiveStatusChange(true);
      initializeMediaPipe();
    }
    return () => {
      onActiveStatusChange(false);
      loopActiveRef.current = false;
      if (faceMeshRef.current) faceMeshRef.current.close();
      if (poseRef.current) poseRef.current.close();
    };
  }, [scriptsLoaded]);

  const initializeMediaPipe = () => {
    if (typeof window === "undefined") return;

    try {
      const FaceMeshLib = (window as any).FaceMesh;
      const PoseLib = (window as any).Pose;

      if (!FaceMeshLib || !PoseLib) {
        console.error("MediaPipe libraries not loaded on window object.");
        return;
      }

      // Initialize FaceMesh
      const fm = new FaceMeshLib({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({
        maxNumFaces: 4,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      fm.onResults(handleFaceMeshResults);
      faceMeshRef.current = fm;

      // Initialize Pose
      const p = new PoseLib({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      p.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      p.onResults(handlePoseResults);
      poseRef.current = p;

      // Start the throttled processing loop
      loopActiveRef.current = true;
      startLoop();

      // Start aggregation timer
      startAggregationTimer();
    } catch (e) {
      console.error("Error initializing MediaPipe:", e);
    }
  };

  const startLoop = async () => {
    if (!loopActiveRef.current) return;

    if (videoRef.current && videoRef.current.readyState >= 2) {
      try {
        const videoElement = videoRef.current;
        // Process both simultaneously (MediaPipe send is async)
        if (faceMeshRef.current) {
          await faceMeshRef.current.send({ image: videoElement });
        }
        if (poseRef.current) {
          await poseRef.current.send({ image: videoElement });
        }
      } catch (e) {
        console.warn("MediaPipe processing frame error:", e);
      }
    }

    // Run at ~4 fps (every 250ms) to ensure low CPU usage
    setTimeout(() => {
      if (loopActiveRef.current) {
        requestAnimationFrame(startLoop);
      }
    }, 250);
  };

  // 30s Aggregator
  const startAggregationTimer = () => {
    const interval = setInterval(() => {
      if (!loopActiveRef.current) {
        clearInterval(interval);
        return;
      }

      const state = frameMetricsRef.current;
      if (state.totalFrames === 0) return;

      // 1. Eye Contact %
      const eyeContactPercent = Math.round((state.eyeContactFrames / state.totalFrames) * 100);

      // 2. Posture stability score
      // Variance of midpoint and shoulder slope
      let postureStabilityScore = 100;
      if (state.shoulderMidpoints.length > 1) {
        const midpoints = state.shoulderMidpoints;
        const angles = state.shoulderAngles;

        const meanX = midpoints.reduce((acc, p) => acc + p.x, 0) / midpoints.length;
        const meanY = midpoints.reduce((acc, p) => acc + p.y, 0) / midpoints.length;
        const varX = midpoints.reduce((acc, p) => acc + Math.pow(p.x - meanX, 2), 0) / midpoints.length;
        const varY = midpoints.reduce((acc, p) => acc + Math.pow(p.y - meanY, 2), 0) / midpoints.length;

        const meanAngle = angles.reduce((acc, a) => acc + a, 0) / angles.length;
        const varAngle = angles.reduce((acc, a) => acc + Math.pow(a - meanAngle, 2), 0) / angles.length;

        // Scale stability score based on variance
        // Lower score if high movement/variance (e.g. variance in midpoints > 0.005 or angle variance > 0.02)
        const variancePenalty = (varX + varY) * 2000 + varAngle * 500;
        postureStabilityScore = Math.max(20, Math.min(100, Math.round(100 - variancePenalty)));
      }

      // 3. Facial engagement
      let engagement: "nodding" | "neutral" | "distracted" = "neutral";
      if (state.noddingDetections > state.totalFrames * 0.15) {
        engagement = "nodding";
      } else if (state.distractedDetections > state.totalFrames * 0.4 || eyeContactPercent < 60) {
        engagement = "distracted";
      }

      // 4. Fidgeting count
      const fidgetingCount = state.fidgetingDetections;

      // Callback
      onIntervalMetrics({
        interval_index: intervalIndexRef.current,
        eye_contact_percent: eyeContactPercent,
        posture_stability_score: postureStabilityScore,
        facial_engagement: engagement,
        fidgeting_count: fidgetingCount,
      });

      // Increment index
      intervalIndexRef.current += 1;

      // Reset aggregator
      frameMetricsRef.current = {
        eyeContactFrames: 0,
        totalFrames: 0,
        shoulderMidpoints: [],
        shoulderAngles: [],
        noddingDetections: 0,
        distractedDetections: 0,
        fidgetingDetections: 0,
        lastNoseY: null,
        noseYHistory: [],
        lastWristPos: { left: null, right: null },
      };
    }, 30000);
  };

  // FaceMesh Results Processing
  const handleFaceMeshResults = (results: any) => {
    const faceCount = results?.multiFaceLandmarks ? results.multiFaceLandmarks.length : 0;
    if (onFaceCountChange) {
      onFaceCountChange(faceCount);
    }

    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected -> count as distracted / no eye contact
      frameMetricsRef.current.totalFrames += 1;
      frameMetricsRef.current.distractedDetections += 1;
      return;
    }

    const state = frameMetricsRef.current;
    state.totalFrames += 1;

    const landmarks = results.multiFaceLandmarks[0];

    // Landmark 1: Nose tip
    const nose = landmarks[1];
    // Landmark 234: Left face edge, 454: Right face edge
    const leftEdge = landmarks[234];
    const rightEdge = landmarks[454];

    // Compute head yaw/turn
    const distLeft = Math.sqrt(Math.pow(nose.x - leftEdge.x, 2) + Math.pow(nose.y - leftEdge.y, 2));
    const distRight = Math.sqrt(Math.pow(nose.x - rightEdge.x, 2) + Math.pow(nose.y - rightEdge.y, 2));
    const symmetryRatio = distLeft / distRight;

    // Yaw is centered if nose is roughly centered
    const isYawCentered = symmetryRatio >= 0.65 && symmetryRatio <= 1.55;

    // Compute head pitch/tilt
    // Forehead (10) to Chin (152) vs Nose
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const distTop = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2));
    const distBottom = Math.sqrt(Math.pow(nose.x - chin.x, 2) + Math.pow(nose.y - chin.y, 2));
    const pitchRatio = distTop / distBottom;
    const isPitchCentered = pitchRatio >= 0.5 && pitchRatio <= 1.8;

    // Eye contact check
    let hasEyeContact = isYawCentered && isPitchCentered;

    // Refine iris position check if refined landmarks exist
    if (landmarks.length >= 478) {
      // Left eye corner left: 33, right: 133, left iris center: 468
      const eyeL = landmarks[33];
      const eyeR = landmarks[133];
      const iris = landmarks[468];

      const distLToIris = Math.sqrt(Math.pow(iris.x - eyeL.x, 2) + Math.pow(iris.y - eyeL.y, 2));
      const distRToIris = Math.sqrt(Math.pow(iris.x - eyeR.x, 2) + Math.pow(iris.y - eyeR.y, 2));
      const eyeSymmetry = distLToIris / distRToIris;

      // If looking away, iris symmetry will be highly skewed
      if (eyeSymmetry < 0.5 || eyeSymmetry > 2.0) {
        hasEyeContact = false;
      }
    }

    if (hasEyeContact) {
      state.eyeContactFrames += 1;
    } else {
      state.distractedDetections += 1;
    }

    // Nodding Detection: vertical nose coordinate oscillation
    if (state.lastNoseY !== null) {
      state.noseYHistory.push(nose.y);
      if (state.noseYHistory.length > 8) {
        state.noseYHistory.shift();
      }

      // Check for simple peaks/troughs in nose Y coordinates (vertical nodding oscillation)
      if (state.noseYHistory.length === 8) {
        let directionChanges = 0;
        let lastDiff = state.noseYHistory[1] - state.noseYHistory[0];
        for (let i = 2; i < state.noseYHistory.length; i++) {
          const diff = state.noseYHistory[i] - state.noseYHistory[i - 1];
          if (Math.sign(diff) !== Math.sign(lastDiff) && Math.abs(diff) > 0.002) {
            directionChanges += 1;
            lastDiff = diff;
          }
        }
        if (directionChanges >= 2) {
          state.noddingDetections += 1;
        }
      }
    }
    state.lastNoseY = nose.y;
  };

  // Pose Results Processing
  const handlePoseResults = (results: any) => {
    if (!results || !results.poseLandmarks || results.poseLandmarks.length === 0) {
      return;
    }

    const state = frameMetricsRef.current;
    const landmarks = results.poseLandmarks;

    // Shoulder posture tracking (11: Left shoulder, 12: Right shoulder)
    const lShoulder = landmarks[11];
    const rShoulder = landmarks[12];

    if (lShoulder && rShoulder && lShoulder.visibility > 0.5 && rShoulder.visibility > 0.5) {
      const midX = (lShoulder.x + rShoulder.x) / 2;
      const midY = (lShoulder.y + rShoulder.y) / 2;
      state.shoulderMidpoints.push({ x: midX, y: midY });

      // Slope angle
      const dy = rShoulder.y - lShoulder.y;
      const dx = rShoulder.x - lShoulder.x;
      const angle = Math.atan2(dy, dx);
      state.shoulderAngles.push(angle);

      // Keep arrays limited to prevent memory bloat
      if (state.shoulderMidpoints.length > 120) state.shoulderMidpoints.shift();
      if (state.shoulderAngles.length > 120) state.shoulderAngles.shift();
    }

    // Fidgeting tracking (15: Left wrist, 16: Right wrist)
    const lWrist = landmarks[15];
    const rWrist = landmarks[16];

    // Check hand movements
    if (lWrist && lWrist.visibility > 0.5) {
      if (state.lastWristPos.left) {
        const dist = Math.sqrt(
          Math.pow(lWrist.x - state.lastWristPos.left.x, 2) + Math.pow(lWrist.y - state.lastWristPos.left.y, 2)
        );
        // Rapid movement (velocity threshold) or hands high near shoulders/face
        if (dist > 0.05 || (lShoulder && lWrist.y < lShoulder.y - 0.05)) {
          state.fidgetingDetections += 1;
        }
      }
      state.lastWristPos.left = { x: lWrist.x, y: lWrist.y };
    }

    if (rWrist && rWrist.visibility > 0.5) {
      if (state.lastWristPos.right) {
        const dist = Math.sqrt(
          Math.pow(rWrist.x - state.lastWristPos.right.x, 2) + Math.pow(rWrist.y - state.lastWristPos.right.y, 2)
        );
        if (dist > 0.05 || (rShoulder && rWrist.y < rShoulder.y - 0.05)) {
          state.fidgetingDetections += 1;
        }
      }
      state.lastWristPos.right = { x: rWrist.x, y: rWrist.y };
    }
  };

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
        strategy="lazyOnload"
        onLoad={() => setScriptsLoaded((prev) => ({ ...prev, faceMesh: true }))}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"
        strategy="lazyOnload"
        onLoad={() => setScriptsLoaded((prev) => ({ ...prev, pose: true }))}
      />
    </>
  );
}
