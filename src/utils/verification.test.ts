import { verification_code } from './verification';

describe('verification_code', () => {
	it('should get the correct verification code from a simple string', () => {
		const code = verification_code('this is your verification code: 123456');
		expect(code).toEqual('123456');
	});

	it('should return the correct code from a multi-line email template', () => {
		const code = verification_code(`
Hi Yuchen,

We received a request to verify your email address.

123456

Enter this code to complete the verification. The code will expire in 15 minutes.`);
		expect(code).toEqual('123456');
	});

	it('should return the correct code from a complex HTML structure', () => {
		const code = verification_code(`
            <td style="font-size: 16px; color: rgb(51, 51, 51);">
                  
                  <p style="margin: 0px 0px 20px; line-height: 24px; font-size: 16px;">
  Dear Valued Client:
</p>
<p style="margin: 0px 0px 20px; line-height: 24px; font-size: 16px;">
  You have applied to <span class="il">verify</span> Sea as your employer. Please enter this <span class="il">code</span> in the app within the next 30 minutes. Do not share it with others.
</p>
<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: rgb(245, 245, 246); border-radius: 8px; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td align="center" style="padding-top: 20px; font-size: 16px;">
        <span class="il">Verification code</span>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 16px 0px 20px; font-size: 32px; font-weight: 400;">
        123456
      </td>
    </tr>
  </tbody>
</table>

</td>
            `);
		expect(code).toEqual('123456');
	});

	it('should return the correct code from a LinkedIn email template', () => {
		const raw = `
        <tr> <td style="padding-top:24px"> <p style="margin:0;font-weight:400;font-size:16px;line-height:1.5">We received a request to verify your email address.</p> </td> </tr>
        <tr> <td style="padding-top:24px"> <p style="margin:0;font-weight:400;font-size:16px;line-height:1.5"><strong>123456</strong></p> </td> </tr>
        <tr> <td style="padding-top:24px"> <p style="margin:0;font-weight:400;font-size:16px;line-height:1.5">Enter this code to complete the verification. The code will expire in 15 minutes.</p> </td> </tr>
        `;
		expect(verification_code(raw)).toEqual('123456');
	});
	it('should return the correct code from a simple HTML snippet', () => {
		const raw = `<p>Your code is: <strong>123456</strong>. Do not share this.</p>`;
		expect(verification_code(raw)).toEqual('123456');
	});
	it('should return the correct code from a styled HTML snippet', () => {
		const raw = `
  <div class="header">Confirmation</div>
  <p>Your login code is below:</p>
  <div style="font-size: 24px; font-weight: bold;"><span>123456</span></div>
`;
		expect(verification_code(raw)).toEqual('123456');
	});
});
