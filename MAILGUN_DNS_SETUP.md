# Ventus Mailgun DNS records

- Domain: **mg.ventustravel.co.uk**
- Mailgun account: **Vinadamo**
- Region: **EU**
- Status: **SPF verified and DKIM active in Mailgun; both records resolve publicly**

The sending records below are installed in Squarespace for `ventustravel.co.uk` with the default 4-hour TTL. Hostnames below are relative to that root domain.

## Required for sending

| Type | Host | Value |
| --- | --- | --- |
| TXT | `mg` | `v=spf1 include:mailgun.org ~all` |
| TXT | `email._domainkey.mg` | Use the complete DKIM value below |

DKIM TXT value (copy as one value):

```text
k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtauG386WFv8fmtP0VIg+k889bujy2zW4vyv1MgwLP5Ztu6uTwS0vXBTZZwQO4S/r1en31jwtaAuFXXkWNhvausLyLzMwd4O3JkjGxGkgDOLyHAYcXIk4YOl2kskMOihFeygELS9FCs44U9N3xO/9D/tjgpjK5DqUfsAhkziYvRnq8ijlXuqbgs8A0craMMsgX3VnvI3kAckKyXZ7a8Fp68/OKTK+IGlaPezt2SrpYLzsQ65FblHFtBahYk0sPPnnz8rZ/ZLu2Z4AccK38SUpSXoag7IjPQWqITh7/odXpUHFYiFyP0GuoLUQNXjaW8Y/spwwSDtXmNpuRntAEuYn2wIDAQAB
```

This is a public DNS key, not the private sending API key.

## Optional records supplied by Mailgun (not installed)

| Purpose | Type | Host | Value | Priority |
| --- | --- | --- | --- | --- |
| Receive mail on the sending subdomain | MX | `mg` | `mxa.eu.mailgun.org` | 10 |
| Receive mail on the sending subdomain | MX | `mg` | `mxb.eu.mailgun.org` | 10 |
| Tracking | CNAME | `email.mg` | `eu.mailgun.org` | — |

The backend disables tracking on its transactional messages. The CNAME is only needed if tracking is enabled later. Mailgun receiving records belong on **mg**, not on the root `@` host. Keep existing root Google mail MX records unchanged.

To recheck verification in future, click **Check status** in [Mailgun's DNS settings](https://app.eu.mailgun.com/mg/sending/mg.ventustravel.co.uk/settings?tab=dns). The two sending records are already verified; receiving and tracking records are optional for this outbound integration.
