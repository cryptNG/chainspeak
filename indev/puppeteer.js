const nodeHtmlToImage = require('node-html-to-image');
const fs = require('fs').promises;
const path = require('path');

const htmlUri =
    'https://bafybeidkuf5scp3asbsb2b5ke2ny5jwk6bsjpn6sbvlcpc6f6ojbd7f5va.ipfs.dweb.link/?filename=index.min.html?adress=0x595461175f1b178d1585398ec4aef6e14090ff95';
const outputPath = path.join(__dirname, 'output.png');

(async () => {
    console.log(`[INFO] Starting image generation for iframe: ${htmlUri}`);

    try {
        const imageBuffer = await nodeHtmlToImage({
            // Instead of giving it a blank <body>, embed an <iframe> that points to your URL:
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              /* Make sure the iframe fills the viewport you’ll screenshot */
              html, body {
                margin: 0;
                padding: 0;
                width: 1280px;
                height: 720px;
                overflow: hidden;
              }
            </style>
          </head>
          <body>
            <iframe
              src="${htmlUri}"
              width="600"
              height="600"
              style="border: none;"
            ></iframe>
          </body>
        </html>
      `,
            puppeteerArgs: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
                // executablePath: '/usr/bin/google-chrome-stable'
            },
            type: 'png',
            // Now selector points to the <iframe> element, not `html`:
            selector: 'iframe',
            beforeScreenshot: async (page) => {
                // Wait for the <iframe> to appear:
                await page.waitForSelector('iframe');

                // Then pause for 2 seconds via a raw Promise:
                await new Promise(resolve => setTimeout(resolve, 2000));
            },


        });

        await fs.writeFile(outputPath, imageBuffer);
        console.log(`[SUCCESS] Image successfully saved to ${outputPath}`);
    } catch (error) {
        console.error('[ERROR] Failed to generate image:', error);
    }
})();
