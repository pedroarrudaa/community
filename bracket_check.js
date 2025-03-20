#!/usr/bin/env node
const fs = require("fs");
const content = fs.readFileSync("src/App.js", "utf8");
let balance = 0;
let lastImbalanceLine = -1;
const lines = content.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === "{") balance++;
    else if (line[j] === "}") {
      balance--;
      if (balance < 0) lastImbalanceLine = i + 1;
    }
  }
  if (i % 500 === 0 || i === lines.length - 1) console.log(`Line ${i + 1}: Balance = ${balance}`);
}
console.log(`\nFinal balance: ${balance}`);
if (lastImbalanceLine !== -1) {
  console.log(`First negative balance at line: ${lastImbalanceLine}`);
  console.log(`Line content: "${lines[lastImbalanceLine - 1]}"`);
}
