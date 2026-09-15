import { signupUser } from './authService';

describe('signupUser', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('sends every field required by the backend signup validator', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, token: 'test-token' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await signupUser({
      email: ' Angus@Example.com ',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: ' Angus ',
      lastName: ' Foggo ',
      phone: ' +61481189028 ',
      cityOfResidence: ' Paddington ',
      agreeToTerms: true,
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      email: 'angus@example.com',
      password: 'password123',
      firstName: 'Angus',
      lastName: 'Foggo',
      phone: '+61481189028',
      cityOfResidence: 'Paddington',
      agreeToTerms: true,
    });
  });
});
