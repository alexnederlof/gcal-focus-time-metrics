# GCal focus time measure

Ever wondered how much time you have to do real deep work?
Ever got colleagues complaining they're in too many meetings to get anything done?

This project helps you analyze where your and your team's time is going. By
Looking at your Google Calendar we try to find how much time you spend

- In focus mode
- In scattered time between meetings
- In meetings, and how much of those are 1/1s and recurring meetings.

## How can you use it

As of yet, the project must be self hosted. It comes with a docker image,
but you need to setup an a Google Api project through the Google Apps console,
with the Cloud Identity and the Calendar APIs enabled.

Then, you need to do two things:

- Create `secrets/credentials.json` with your credentials, as described in [the Node.js tutorial](https://developers.google.com/calendar/api/quickstart/nodejs)
- Create a `.env` file, or in some other way, set [your Google Customer ID](https://support.google.com/a/answer/10070793?hl=en) in the `GOOGLE_CUSTOMER_ID` environment variable.

Then you can

```
docker run -p 3000:3000 \
    -v $PWD/secrets/credentials.json:/secrets/credentials.json \
    -e GOOGLE_CREDENTIALS=/secrets/credentials.json \
    -e GOOGLE_CUSTOMER_ID=C123 \
    ghcr.io/alexnederlof/gcal-focus-time-metrics

```

You can now access:

- The main interface at [http://localhost:3000]()
- the health check at [http://localhost:3000/\_health]()
- the metrics at [http://localhost:3000/metrics]()

All config

| Key                    | Default | Description                                                                   |
| ---------------------- | ------- | ----------------------------------------------------------------------------- |
| GOOGLE_CREDENTIALS     |         | Location of your credentials file                                             |
| GOOGLE_CUSTOMER_ID     |         | [your Google Customer ID](https://support.google.com/a/answer/10070793?hl=en) |
| GOOGLE_CONCURRENT_REQS | 5       | Amount of requests to run to Google Calendar in parallel                      |

## Staring in develop mode

Assuming you've done the security setup above, you can:

- Run the debug configurations for VScode that come with the project
- Run `yarn watch` to start the server in watch mode

## Building

Building is as easy as just building the docker image.

`docker build .`
