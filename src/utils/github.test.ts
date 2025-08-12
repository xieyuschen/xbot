import { processFile } from './github';

describe('processFile', () => {
	const today = new Date('2024-06-10T12:00:00Z');
	const newContent = 'AAA';

	it("should prepend a new section if today's section does not exist", () => {
		const fileContent = `
# 2025
<!-- generate.py marker: 20251231 -->

Some intro text.
## Jun 2024
#### 09 Jun 2024
BBB
`;
		const expectedContent = `
# 2025
<!-- generate.py marker: 20251231 -->

Some intro text.
## Jun 2024
#### 10 Jun 2024
${newContent}

#### 09 Jun 2024
BBB
`;

		expect(processFile(today, fileContent, newContent)).toBe(expectedContent);
	});

	it("should append new content to today's section if it exists", () => {
		const fileContent = `
# 2025
<!-- generate.py marker: 20251231 -->

Some intro text.
## Jun 2024
#### 10 Jun 2024
Should be appended.
`;
		const expectedContent = `
# 2025
<!-- generate.py marker: 20251231 -->

Some intro text.
## Jun 2024
#### 10 Jun 2024
Should be appended.

${newContent}
`;
		expect(processFile(today, fileContent, newContent)).toBe(expectedContent);
	});
});
