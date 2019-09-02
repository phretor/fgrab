const fs = require('fs');
const puppeteer = require('puppeteer');
const argv = require('minimist')(process.argv.slice(2));
const readline = require('readline');
const A = require('async');
const sharp = require('sharp');
const path = require('path');
const phash = require('imghash').hash;

(async () => {
    const concurrency = parseInt(argv.procs) || 1;
    const force = argv.force !== undefined;
    const base = argv.base;

    const user = process.env.USER;
    const pass = process.env.PASS;
    const ext = 'jpg';

    const auth = new Buffer(`${user}:${pass}`).toString('base64');

    let browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        timeout: 40000
    });

    console.log(`Browser launched with concurrency ${concurrency} (force: ${force})`);

    let q = A.queue(function (task, callback) {
        browser.newPage().then(async page => {
            try {
                const thumb = await task.path.replace(`.${ext}`, `.thumb.${ext}`)

                await page.setExtraHTTPHeaders({
                    'Authorization': `Basic ${auth}`
                });

                const response = await page.goto(task.url, { waitUntil: 'load' });

                if (response.status !== 200)
                    throw `Cannot load page because status is ${response.status}`;

                await page.screenshot({
                    fullPage: true,
                    path: task.path
                });

                sharp(task.path)
                    .resize(128, 128)
                    .crop('north')
                    .toFile(thumb)
                    .then(() => {
                        phash(thumb)
                            .then(hash => {
                                const
                                    bn_thumb    = path.basename(thumb),
                                    bn          = path.basename(task.path),
                                    dn_thumb    = path.dirname(thumb),
                                    dn          = path.dirname(task.path),
                                    thumb_to    = path.join(dn_thumb, `${hash}-${bn_thumb}`),
                                    img_to      = path.join(dn, `${hash}-${bn}`);

                                fs.rename(thumb, thumb_to, (e) => {
                                    if (e)
                                        console.error(`Cannot rename ${thumb} -> ${thumb_to}: ${e}`);
                                    else
                                        console.log(`Done ${thumb} -> ${thumb_to}`);
                                });

                                fs.rename(task.path, img_to, (e) => {
                                    if (e)
                                        console.error(`Cannot rename ${task.path} -> ${img_to}: ${e}`);
                                    else
                                        console.log(`Done ${task.path} -> ${img_to}`);
                                });
                            });
                        console.log(`Created ${thumb}`);
                    });
            } catch (e) {
                console.error(`Error: ${e}`);
            } finally {
                try {
                    await page.close();
                } catch (e) {
                    console.error(`Could not close page: ${e}`)
                } finally {
                    await callback(task.url);
                }
            }
        });
    }, concurrency);

    q.drain = async function() {
        console.log('All tasks processed');

        try {
            if (browser)
                await browser.close()
        } catch (e) {
            console.error(`Could not close browser: ${e}`);
        }
    }

    readline.createInterface({
        input: process.stdin
    }).on('line', line => {
        const row = line.split(' ');
        const fpath = path.join(base, row[0]);

        if (!fs.existsSync(fpath) || force) {
            q.push({
                path: fpath,
                url: row[1]
            }, function (url) {
                console.log(`Done with URL ${url}`);
            });
        } else {
            console.log(`Not processing ${line}: file exists!`)
        }
    }).on('close', () => {
        console.log(`All data parsed: ${q.length()} items enqueued`);
    });
})();
