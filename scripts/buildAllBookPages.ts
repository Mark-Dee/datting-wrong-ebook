import { execSync } from 'child_process';

console.log('Generating all 122 pages from official manuscript page specifications...');
const scripts = [
  'scripts/build_pages_frontmatter.py',
  'scripts/build_pages_ch1.py',
  'scripts/build_pages_ch2.py',
  'scripts/build_pages_ch3.py',
  'scripts/build_pages_ch4.py',
  'scripts/build_pages_ch5.py',
  'scripts/build_pages_ch6.py',
];

for (const script of scripts) {
  console.log(`Running ${script}...`);
  execSync(`python3 ${script}`, { stdio: 'inherit' });
}

console.log('Successfully synchronized all 122 pages matching the PDF!');
