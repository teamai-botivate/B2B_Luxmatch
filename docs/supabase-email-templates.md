# LuxeMatch Supabase Auth Email Templates

Use these in Supabase Dashboard -> Authentication -> Emails -> Templates.

Supabase supports variables such as:

- `{{ .Token }}`: 6-digit OTP code
- `{{ .ConfirmationURL }}`: Supabase verification/sign-in link
- `{{ .SiteURL }}`: configured site URL
- `{{ .RedirectTo }}`: redirect URL passed from the app
- `{{ .Email }}`: current email address
- `{{ .NewEmail }}`: new email address for email-change flows

## Magic Link or OTP

Subject:

```text
Your LuxeMatch sign-in code
```

HTML:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your LuxeMatch sign-in code</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;letter-spacing:.2px;">
                  <span style="color:#c9a84c;">Luxe</span>Match
                </div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Secure jewellery shopping sign-in</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#17130c;">Your sign-in code</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  Use this one-time code to continue your LuxeMatch session.
                </p>
                <div style="font-size:34px;line-height:1;letter-spacing:8px;font-weight:700;color:#17130c;background:#fbf7ef;border:1px solid #eadfca;border-radius:12px;padding:20px;text-align:center;">
                  {{ .Token }}
                </div>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  This code expires shortly. If you did not request this email, you can safely ignore it.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#17130c;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                        Continue to LuxeMatch
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fbf7ef;color:#8a7c67;font-size:12px;line-height:1.5;">
                Sent to {{ .Email }}. LuxeMatch will never ask for this code outside the sign-in screen.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Confirm Sign Up

Subject:

```text
Confirm your LuxeMatch email
```

HTML:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirm your LuxeMatch email</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;"><span style="color:#c9a84c;">Luxe</span>Match</div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Email confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Confirm your email</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  Confirm this email address to finish setting up your LuxeMatch account.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#17130c;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                        Confirm email
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  Or enter this code in the app: <strong style="letter-spacing:4px;color:#17130c;">{{ .Token }}</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fbf7ef;color:#8a7c67;font-size:12px;line-height:1.5;">
                If you did not create a LuxeMatch account, ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Invite User

Subject:

```text
You are invited to LuxeMatch
```

HTML:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You are invited to LuxeMatch</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;"><span style="color:#c9a84c;">Luxe</span>Match</div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Invitation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Join LuxeMatch</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  You have been invited to create a LuxeMatch account.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#17130c;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  Invitation code: <strong style="letter-spacing:4px;color:#17130c;">{{ .Token }}</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fbf7ef;color:#8a7c67;font-size:12px;line-height:1.5;">
                This invitation was sent to {{ .Email }}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Change Email Address

Subject:

```text
Confirm your new LuxeMatch email
```

HTML:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirm your new LuxeMatch email</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;"><span style="color:#c9a84c;">Luxe</span>Match</div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Email change confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Confirm your new email</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  Confirm that you want to use {{ .NewEmail }} for your LuxeMatch account.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#17130c;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                        Confirm new email
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  If you did not request this change, do not confirm it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Reset Password

Subject:

```text
Reset your LuxeMatch password
```

HTML:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your LuxeMatch password</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;"><span style="color:#c9a84c;">Luxe</span>Match</div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Password reset</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Reset your password</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  Use the secure link below to reset the password for {{ .Email }}.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#17130c;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                        Reset password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  Reset code: <strong style="letter-spacing:4px;color:#17130c;">{{ .Token }}</strong>
                </p>
                <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  If you did not request a password reset, ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Reauthentication

Subject:

```text
Confirm this LuxeMatch action
```

HTML:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirm this LuxeMatch action</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;"><span style="color:#c9a84c;">Luxe</span>Match</div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Security check</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Confirm it is you</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  Enter this code to continue with the sensitive action in LuxeMatch.
                </p>
                <div style="font-size:34px;line-height:1;letter-spacing:8px;font-weight:700;color:#17130c;background:#fbf7ef;border:1px solid #eadfca;border-radius:12px;padding:20px;text-align:center;">
                  {{ .Token }}
                </div>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7b6f5b;">
                  If you did not request this, secure your account and ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```
