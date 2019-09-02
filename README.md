# Concurrent screenshot grabber based on Chrome Puppeteer

Simple script to concurrently grab full-page screenshots of websites and save them follows:

    * `perceptual_hash-given_file_name.jpg`
    * `perceptual_hash-given_file_name-thumb.jpg`

Where the perceptual hash is the pHash of the image and the thumb is, well, the
thumbnail of the image north-cropped to 128px by 128px.


# Install it
```
$ git clone <this repo>
$ cd fgrab/
$ npm i
```


# Grab an image

```
$ echo "filename.jpg http://maggi.cc | node index.js --base /tmp/"
```


# Grab more images, concurrently
Just feed it a list of `filename` `url` pairs and it'll do the job.

```
$ cat file_url.list | node index.js --base /tmp/ --procs 5 --force
```


# HTTP Basic Authentication

Just set the USER and PASS environment vairables to the username and passwords
required by the site that you're grabbing. Sorry, I needed to grab multiple pages
from the same site, so no support for per-site credentials.
