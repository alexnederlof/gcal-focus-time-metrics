import { Logger } from 'tslog';

const log = new Logger();

async function main() {
    log.info("Hey there")
}

main().catch(e => {
    log.error(e);
    process.exit(1);
})