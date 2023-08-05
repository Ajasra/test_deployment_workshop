import { Button, Container, Input, Loader, Title } from "@mantine/core";
import { useContext, useState } from "react";
import { ChatContext, ChatDispatchContext } from "components/Context/context";
import { ShowInfo } from "utils/notifications";
import { getConversationindex, delay } from "utils/conv_helpers";
import { ShowError, ShowSuccess } from "styles/utils/notifications";
import GenerateVideo from "./GenerateVideo";

// ---------------------------------------------------------------------------------------------
// Backend API URL loaded from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API;
// Local API key loaded from environment variable
const LOCAL_KEY = process.env.NEXT_PUBLIC_LOCAL_KEY;
// ---------------------------------------------------------------------------------------------

export default function ChatForm(props) {
  // Get conversation prop
  const { conversation } = props;

  // Get chat context and dispatcher from Context API
  const chatContext = useContext(ChatContext);
  const setChatContext = useContext(ChatDispatchContext);

  // Component state for form 
  const [question, setQuestion] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [genVideo, setGenVideo] = useState(false);
  const [answer, setAnswer] = useState('')

  // Play sound
  async function playSound(url) {
    setProcessing(true);
    await delay(1500);
    const audioElement = new Audio(url);

    audioElement.addEventListener('ended', () => {
      setProcessing(false);
    });

    audioElement.addEventListener('canplaythrough', () => {
      audioElement.play();
    });
  }

  // Handle form submission
  async function getResponse() {
    // Default to making request
    let continueRequest = true;

    // Validate input
    if (question == "") {
      setQuestionError("Please enter a question");
      continueRequest = false;
      return;
    } else {
      setQuestionError("");
    }

    // Check if request should continue
    if (continueRequest) {
      // Set processing state so we wouldn't able to submit form again while processing
      setProcessing(true);
      ShowInfo("Please wait", "Getting response...");

      // ---------------------------------------------------------------------------------------------
      // Try making API request
      try {

        // Build API URL, using env var if defined
        let api_url = "/api/get_response"; 
        if (BACKEND_URL !== undefined) {
          api_url = `${BACKEND_URL}/get_response`;
        }

        // Get chat history for request from the context (local storage)
        let history = [];
        if (conversation.history != null) { 
          history = conversation.history;
        }

        // Make POST request to API 
        // The headers are used to provide additional information about the request and desired response format.
        // Some key points:
        // - Content-Type: Tells the server request body is JSON
        // - Accept: Tells server to return JSON response
        // This allows sending the request body as JSON and ensuring the API returns JSON that can be directly parsed in the client code.
        // Without these headers:
        // - Server may not know to parse request body as JSON
        // - Response may not be JSON by default
        // So they provide metadata to ensure smooth request/response handling.
        const response = await fetch(api_url, {
          method: "POST",
          headers: {
            // Set Content-Type header to send JSON body
            "Content-Type": "application/json",
            // Set Accept header to specify receiving JSON response
            Accept: "application/json",
          },
          // Send request body as JSON
          // Stringify request body as JSON
          body: JSON.stringify({
            history: history, 
            api_key: LOCAL_KEY,
            question: question,  
          }),
        });

        // Parse JSON response 
        // The response.json() method parses the response body into a JavaScript object.
        // Some key points:
        // - It is awaited because parsing is asynchronous
        // - .catch() is used to handle any parsing errors
        // - If parsing fails, it will log error and update state
        // This allows directly accessing the parsed JSON body on the json object.
        // Without awaiting and handling errors, the code would fail if:
        // - Response body is not valid JSON
        // - Parsing rejects for any reason
        // So this handles parsing the body safely and accessing the resulting JSON data.
        const json = await response.json().catch((err) => {
          // Handle JSON parsing errors
          console.error(err);
          // ShowError("Error", "Something went wrong. Please try again.");
          setProcessing(false);
        });

        // Handle successful response
        if (json.code == 200) {
          // Update chat history in context
          // Get conversations array from context
          let conv = chatContext?.conversations;
          // Get index of current conversation
          let indx = getConversationindex(conv, conversation.id);
          // Get current history or empty array
          let history = conv[indx]?.history || []; // or empty array
          // Append new question/response 
          history.push({
            question: question,
            response: json.response 
          });
          // Update conversation with new history
          conv[indx].history = history;

          // Update context
          setChatContext({
            // Spread existing context values (we need to give current context to not overwrite other values)
            ...chatContext,
            // Overwrite only conversations with updated array
            conversations: conv,
            // Set action to flag history was updated
            // this we would use in the conversation component to update the UI
            action: "update history",
          });
          
          // Clear question, return response
          setProcessing(false);
          setQuestion("");
          ShowSuccess("Success", "Response received.");
          return json.response;

        }else{
          setProcessing(false);
          ShowError("Error", "Something went wrong. Please try again.");
          return null; 
        }

      } catch (e) {
        // Handle errors
        console.log(e);
        setProcessing(false);
        setQuestion("");
        ShowError("Error", "Something went wrong. Please try again.");
        return null; 
      }
      // ---------------------------------------------------------------------------------------------
    }
  }

  async function getVoice(){

    const resp_text = await getResponse();
    if( resp_text == null ){
      return;
    }
    ShowSuccess("Success", "Response received.");
    setProcessing(true);

    try {

      let api_url = "/api/elevenlabs"; 
      if (BACKEND_URL !== undefined) {
          api_url = `${BACKEND_URL}/elevenlabs`;
      }

      const response = await fetch(api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ message: resp_text, key: LOCAL_KEY }),
      });

      ShowInfo("Please wait", "Getting voice...");

      const json = await response.json().catch((err) => {
        console.error(err);
        ShowError("Error", "Cant generate speach now. Please try again.");
        setProcessing(false);
      }).then(async (res) => {
        if(res.error == null){
          ShowSuccess("Success", "Voice received.");
          setProcessing(false);
          const s_id = res.response;
          await playSound('/resp/r_'+s_id+'.mp3');
          return res.response;
        }
      })

    }catch(e){
      console.log(e);
      setProcessing(false);
      ShowError("Error", "Something went wrong. Please try again.");
      return null; 
    }

  }


  async function getVideo() {
    
    const resp_text = await getResponse();
    if (resp_text == null) {
      return;
    }
    ShowSuccess("Text response generated");
    setProcessing(true);
    console.log(resp_text);
    ShowInfo("Generating video");
    setAnswer(resp_text);
    setGenVideo(true);
  }
  
  // Container - Wrapper for form
  // Title - Page title
  // Input - Question input
  // Input.value - Set input value to question state
  // Input.onChange - Update question state on input change
  // Input.error - Set error message to questionError state
  // Button - Submit button
  // Button.onClick - Call getResponse() on click
  // Button.disabled - Disable button while processing
  return (
    <Container mt={32} >
      <Title order={3}>Ask a question</Title>
      <GenerateVideo text={answer} genVideo={genVideo} setGenVideo={setGenVideo} updProcessing={setProcessing} />
      <Input
        label="Your question"
        placeholder="What is the meaning of life?"
        required
        variant="filled"
        size="lg"
        value={question}
        mt={16}
        error={questionError}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <Button onClick={getResponse} mt={16} mr={8} disabled={processing}>
        {processing ? <Loader size="sm" /> : "Ask"}
      </Button>
      <Button onClick={getVoice} mt={16} mr={8} disabled={processing}>
        {processing ? <Loader size="sm" /> : "Voice"}
      </Button>
      <Button onClick={getVideo} mt={8} disabled={processing}>
          {processing ? <Loader size="sm" /> : "Video"}
      </Button>
    </Container>
  );
}
