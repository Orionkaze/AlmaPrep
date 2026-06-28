const fileContent = `function twoSum(nums, target) {
  // Your solution here
}

module.exports = { twoSum };`;

const original = `function twoSum(nums, target) { // Your solution here }`;
const replacement = `function twoSum(nums, target) {
  const numMap = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (numMap.has(complement)) {
      return [numMap.get(complement), i];
    }
    numMap.set(nums[i], i);
  }
  return null;
}`;

function replaceIgnoringWhitespace(fileContent, original, replacement) {
  const content = fileContent.replace(/\r\n/g, "\n");
  const orig = original.replace(/\r\n/g, "\n");
  
  const cleanOriginal = orig.replace(/\s+/g, "");
  if (!cleanOriginal) return null;
  
  let origIdx = 0;
  let startIdx = -1;
  let endIdx = -1;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (/\s/.test(char)) {
      continue;
    }
    
    if (char === cleanOriginal[origIdx]) {
      if (origIdx === 0) {
        startIdx = i;
      }
      origIdx++;
      if (origIdx === cleanOriginal.length) {
        endIdx = i + 1;
        break;
      }
    } else {
      if (startIdx !== -1) {
        i = startIdx;
        startIdx = -1;
        origIdx = 0;
      }
    }
  }
  
  if (startIdx !== -1 && endIdx !== -1 && origIdx === cleanOriginal.length) {
    return content.slice(0, startIdx) + replacement + content.slice(endIdx);
  }
  
  return null;
}

const result = replaceIgnoringWhitespace(fileContent, original, replacement);
console.log('Result successful?', result !== null);
if (result) {
  console.log('--- Result Content ---');
  console.log(result);
}
