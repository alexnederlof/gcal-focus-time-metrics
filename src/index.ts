import { Logger } from 'tslog';
import { authorize, listEvents, newCalendarClient } from './gcal';

const log = new Logger();

async function main() {
    log.info("Hey there, let's go")
    let cal = await newCalendarClient();
    await listEvents(cal);
    let {data: settings}= await cal.settings.list({
        maxResults: 100
    });
    console.log(settings.items);
    
}

main().catch(e => {
    console.error(e)
    process.exit(1);
})