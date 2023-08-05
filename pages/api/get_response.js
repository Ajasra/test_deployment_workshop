// Import ChatOpenAI langchain module to create an OpenAI chatbot 
import { ChatOpenAI } from "langchain/chat_models/openai";

// Import ConversationChain langchain module to manage conversation flow
import { ConversationChain } from "langchain/chains";  

// Import prompt templates and placeholders from langchain
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";

// Import memory classes from langchain 
import { BufferMemory, ChatMessageHistory } from "langchain/memory";

// Import chat message schemas from langchain
import { AIChatMessage, HumanChatMessage } from "langchain/schema";

// Utility to send status codes
import { sendStatusCode } from "next/dist/server/api-utils";

// API keys loaded from environment variables
const local_api = process.env.NEXT_PUBLIC_LOCAL_KEY; 
const openai_api = process.env.NEXT_PUBLIC_OPANAI_API;

// Prompt to define assistant's personality  
const SYSTEM_PROMPT = "You are funny personal assistant. You like comedy and philosophy. All your responses should be funny and philosophical."

export default async function handler(req, res) {

  // Only handle POST requests
  if (req.method == 'POST') {

    // Get request body
    const { api_key, question, history } = req.body  

    // Validate API key
    if (api_key != local_api){
      res.status(404).json({ 
        success: false, 
        error: 404, 
        message: 'API key not found' 
      })
    }
    
    // Create ChatOpenAI instance 
    // temperature: This controls the "creativity" of the model's responses. A lower temperature like 0 will result in more deterministic/ focused responses. Higher values like 1 allow for more variation.
    // openAIApiKey: This should be your OpenAI API key to authenticate requests.
    // modelName: This specifies which OpenAI model to use for generating responses. Here it is using gpt-3.5-turbo-0613, which is one of the latest GPT-3 models. You can find more models here > https://platform.openai.com/docs/models 
    const chat = new ChatOpenAI({
      temperature: 0,
      openAIApiKey: openai_api, 
      modelName: "gpt-3.5-turbo-0613",
    });

    // Create chat prompt template using ChatPromptTemplate helper
    // You can find documentation for ChatPromptTemplate here > https://js.langchain.com/docs/modules/model_io/prompts/prompt_templates/
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
        // Add system message to define assistant personality
        SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT),  
        // Add messages placeholder to insert chat history
        new MessagesPlaceholder("history"),
        // Template for user input 
        HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]);

    // Array to store chat history 
    const pastMessages = [];
    // Loop through provided chat history
    // documentation and example here > https://js.langchain.com/docs/modules/memory/how_to/buffer
    for (let i = 0; i < history.length; i++) {
        // Add each question as a HumanChatMessage
        pastMessages.push(new HumanChatMessage(history[i].question));
        // Add each response as a AIChatMessage
        pastMessages.push(new AIChatMessage(history[i].response));
    }
    // Create memory object to store chat history
    const memory = new BufferMemory({
        // Return chat messages when generating responses
        returnMessages: true, 
        // Key to identify chat history in memory
        memoryKey: "history",  
        // Create ChatMessageHistory from past messages
        chatHistory: new ChatMessageHistory(pastMessages), 
    });

    // Create conversation chain 
    // documentation and example here > https://js.langchain.com/docs/api/chains/classes/ConversationChain
    const chain = new ConversationChain({
       // Pass configured memory
        memory: memory,
        // Pass defined prompt template 
        prompt: chatPrompt,
        // Pass ChatOpenAI instance as the LLM
        llm: chat,
    });

    // Log input question for debugging
    // console.log(question);

    // Use a try/catch block to handle errors
    try {
      // Call chain to get response  
    //   Under the hood it does things like:
    //   - Use the prompt template and memory to construct a full prompt with history + new input
    //   - Pass generated prompt to the LLM (ChatOpenAI) to generate a response
    //   - Process the raw LLM response to extract the chat response
    //   - Potentially update memory based on the exchange
    //   - It returns a ConversationResponse containing properties like:
      const response = await chain.call({
        // input is the variable name chain expect for the user's question
        input: question,
      });

      // Log and return response
      // console.log(response);
      res.status(200).json({
        // Status code 
        code: 200,
        // Extract text of chatbot's response
        response: response.response
      });

    } catch (error) {
      // Log and return any errors
      console.log(error);
      res.status(500).json({
        code: 500, 
        error: error
      });
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