import { useEffect, useRef } from "react";


export default function VideoPlayer(props) {

  const { videourl, height, setIsVideoFinished } = props;

//   videourl = "https://d-id-talks-prod.s3.us-west-2.amazonaws.com/auth0%7C64cc7a139df8d7d3073d8af1/tlk_LbmyMD8W37mrJ0lPBXkYJ/1691206998057.mp4?AWSAccessKeyId=AKIA5CUMPJBIK65W6FGA&Expires=1691293433&Signature=%2FAIxcZeukn5RtiDk9IWGCdt4eL8%3D&X-Amzn-Trace-Id=Root%3D1-64cdc579-5f22544a53ae01574757ea4a%3BParent%3D5f13618d3f4c2584%3BSampled%3D1%3BLineage%3D6b931dd4%3A0"
//     height = 400;

    // crreate empty reference to video html object
  const videoRef = useRef(null);

  // call when video url changed
  useEffect(() => {
    if (videourl !== null) {
      videoRef.current.load();
      videoRef.current.play();
      setIsVideoFinished(false);
    }
  }, [videourl]);

  // call when video finish to play
  const handleVideoEnded = () => {
    setIsVideoFinished(true);
  };

  return (
    <video ref={videoRef} height={height} onEnded={handleVideoEnded}>
      {
        videourl && <source src={videourl} type="video/mp4" />
      }
    </video>
  );
}
