import textToSpeech from "elevenlabs-api";
const fs = require("fs");
const path = require("path");

const LOCAL_KEY = process.env.NEXT_PUBLIC_LOCAL_KEY;
const API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const EXPIRE_DAYS = process.env.NEXT_PUBLIC_EXPIRE_DAYS;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// delete old files to clean up the space
async function deleteOldFiles ()  {
    const folderPath = path.join(process.cwd(), "public", "resp");
    const files = fs.readdirSync("./public/resp");
  
    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - EXPIRE_DAYS);
  
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const fileStats = fs.statSync(filePath);
      const fileModifiedTime = new Date(fileStats.mtime);
  
      if (fileModifiedTime < twoDaysAgo) {
        fs.unlinkSync(filePath);
      }
    });
  };

export default async function handler(req, res) {

    // Only handle POST requests
    if (req.method == 'POST') {

        await deleteOldFiles();
  
      // Get request body
      const { message, key } = req.body  
  
      // Validate API key
      if (key != LOCAL_KEY){
        res.status(404).json({ 
          success: false, 
          error: 404, 
          message: 'API key not found' 
        })
      }

      if (message.length == 0) {
        res.status(404).json({ error: "Empty message" });
        return;
      }

      try {

        const timestamp = new Date().getTime();
        const filename = `public/resp/r_${timestamp.toFixed(0)}.mp3`;

        textToSpeech(API_KEY, message, VOICE_ID, filename)
        .then(
            async (response) => {
              // add short delay to be sure it finish writing in file
              // await delay(1500);
              console.log(`Success, Audio saved as: ${filename}`);
              res.status(200).json({ error: null, response: timestamp.toFixed(0) });
            }
          );

      }catch(error) {
        console.error(
            `An error occurred while converting text to speech: ${error}`
        );
        res.status(500).json({ error: "An error occurred while converting text to speech" });
      }
     
    } else {
        // Reject non-POST requests
        res.status(405).json({
          success: false,
          error: 405,
          message: 'Method not allowed'
        })
      }

}
