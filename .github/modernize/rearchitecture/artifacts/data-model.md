# Data model

Core entities are `User`, `Advertiser`, `Company`, `Campaign`, `Tablet`, `Bus`,
`Media`, and `Impression`. A user may own one advertiser, an advertiser owns
campaigns, campaigns reference media and delivery devices, and tablets belong to
buses. `User.plan` is the subscription authority and `User.avatarUrl` references
the persisted upload URL. Plan limits are configuration values in the frontend
and enforced again in backend services.
