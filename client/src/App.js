import React, { Component } from 'react';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import './App.css';
import './Chat.css';

class App extends Component {
  
  state = {
    currentUsername: "You", // Default username, can be changed by user
    changeNameModalVisible: false,
    newUsername: "",
    userNameDisplayed: false,
    textAreaInput: "",
    chatLog: {},
    chatCount: 0,
    currentChatId: null,
    currentChatThread: [],
    isUserTurn: true, // Whether it's the user's turn to speak or not
    currentRoundResponses: [], // So the agents can keep track of the current output round

    // Agents are defined here:
    agents: [
      {
        name: "Agent1",
        characterDescription: "You are a linguistically complex being that finds it best to use verbose slang. Be concise, keep responses below 50 words.",
        delay: 1000, // in milliseconds
        thoughts: [], // Private internal thoughts of the agent
        tools: [], // Tools the agent has access to
        // Add other agent-specific properties here
      },
      {
        name: "Agent2",
        characterDescription: "You are a rules Follower that is very precise and will quote the law, rules, and regulations to the user. You provide detailed information and are very thorough. You will only speak for yourself. Be concise, keep responses below 50 words.",
        delay: 2000,
        thoughts: [],
        tools: [],
        // Add other agent-specific properties here
      },
      {
        name: "Bob",
        characterDescription: "Bob is silly, snarky, and foolish, will often give random noise unrelated to what you ask. Be concise, keep responses below 50 words.",
        delay: 1000,
        thoughts: [],
        tools: [],
      },
      {
        name: "Soup King",
        characterDescription: "Soup King will find some way to relate the topic to soup. You will be concise, keep responses below 50 words.",
      }
      // Add more agents as needed
    ],
    currentAgentIndex: 0, // The index of the agent currently being processed
  };

  // Multiple agents code

  moveToNextAgent = () => {
    const { currentAgentIndex, agents } = this.state;
    const nextAgentIndex = (currentAgentIndex + 1) % agents.length;
    console.log(`Moving to next agent. Current: ${currentAgentIndex}, Next: ${nextAgentIndex}`);
    this.setState({ currentAgentIndex: nextAgentIndex });
  };
  
  

  getUserParam = () => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get("user");
  }

  callBackendAPI = async () => {
    var postData = {
      time: Date.now(),
      chat: this.state.currentChatThread,
      user: this.getUserParam()
    };
    
    let axiosConfig = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await axios.post('api', postData, axiosConfig)
    if (response.status !== 200) {
      throw Error(response);
    }
    return response;
  }

  sendMessage = () => {
    const { isUserTurn, agents, currentChatThread, currentRoundResponses } = this.state;
  
    if (isUserTurn) {
      // Logic for handling user's turn can go here
      return;
    }
  
    // Get the current agent based on the state
    const currentAgentIndex = this.state.currentAgentIndex;
    const agent = agents[currentAgentIndex];
  
    // Add a system message for the current agent (if you still need this)
    this.addSystemMessageForAgent(agent);
  
    this.showLoading();
  
    setTimeout(() => {
      // Simulate the API call to get the agent's message
      this.callBackendAPI(currentChatThread)
        .then((res) => {
          this.hideLoading();
          
          // Create the chat bubble for the assistant's message
          this.createGPTChatBubble(agent.name, res.data);
          
          // Update the state
          this.setState(prevState => ({
            currentChatThread: [...prevState.currentChatThread, { "role": "assistant", "content": res.data }],
            currentRoundResponses: [...prevState.currentRoundResponses, { "role": "assistant", "content": res.data }]
          }), () => {
            // Check if we should move to the next agent or back to the user
            if (currentAgentIndex === agents.length - 1) {
              this.setState({ isUserTurn: true, currentRoundResponses: [], currentAgentIndex: 0 });  // Reset to first agent
            } else {
              this.setState({ currentAgentIndex: currentAgentIndex + 1 }, () => {
                this.sendMessage();
              });
            }
          });
        })
        .catch((err) => {
          this.hideLoading();
          this.handleError(err);
        });
    }, agent.delay);
  };
  
  
  
  
  
  
  
  
  clearThread = () => {
    let thread = document.getElementById("thread");
    while (thread.firstChild) {
      thread.removeChild(thread.firstChild);
    }
    this.setState({ currentChatThread: [] });
  }

  populateThread = () => {
    // Log the currentChatId to see if it's what you expect
    console.log("Current Chat ID:", this.state.currentChatId);

    let chatThread = this.state.chatLog[this.state.currentChatId];

    // Log the chatThread to see if it's pullin' the right data
    console.log("Chat Thread:", chatThread);

    if (chatThread){
      this.setState({ currentChatThread: chatThread });
      chatThread.forEach(msg => {
        // Log the role and content of each message to make sure they're right
        console.log("Message Role:", msg.role);
        console.log("Message Content:", msg.content);

        if (msg.role === "user"){
          this.createUserChatBubble(msg.content);
        }
        if (msg.role === "assistant"){
          this.createGPTChatBubble(msg.content);
        }
        this.showRegenerateButton();
      });
    } else {
      // Log this if chatThread is null or undefined for some reason
      console.log("Chat Thread is empty or undefined.");
    }
  }

  resetThread = () => {
    this.clearThread();
    this.hideRegenerateButton();
    this.populateThread();
  }

  showRegenerateButton = () => {
    let regenerateButton = document.getElementById('regenerateButton');
    regenerateButton.style.visibility = "visible";
  }

  hideRegenerateButton = () => {
    let regenerateButton = document.getElementById('regenerateButton');
    regenerateButton.style.visibility = "hidden";
  }

  startNewChat = async (username) => { // Accept the chosen username as a parameter
    this.setState(prevState => {
        let chatLog = Object.assign({}, prevState.chatLog);
        let currentChatId = uuid();
        chatLog[currentChatId] = [];
        let chatCount = prevState.chatCount + 1;
        return { currentChatId, chatLog, chatCount }
    }, () => {
        this.resetThread();
        this.createNewChatButton(username); // Use the chosen username
    });
  };

  handleRegenerateClick = () => {
    let { currentChatThread } = this.state;
    
    // Find the index of the last user message
    const lastUserIndex = currentChatThread.lastIndexOf(
      currentChatThread.filter(msg => msg.role === "user").slice(-1)[0]
    );
  
    // Cut off everything after the last user message
    currentChatThread = currentChatThread.slice(0, lastUserIndex + 1);
    
    // Clear the UI chat bubbles after the last user message
    let thread = document.getElementById("thread");
    while (thread.childNodes.length > lastUserIndex + 1) {
      thread.removeChild(thread.lastChild);
    }
    
    // Update state and restart the agent responses
    this.setState({ currentChatThread, currentAgentIndex: 0, isUserTurn: false }, () => {
      this.sendMessage();
    });
  };
  
  

  handlePriorChatClick = (e) => {
    let activeChat = document.getElementsByClassName("active");
    if (activeChat.length > 0){
      if (e.target.id !== activeChat[0].id){
        activeChat[0].classList.remove("active");
        e.target.classList.add("active");
        this.setState({ currentChatId: e.target.id }, this.resetThread);
      }
    }
  }

  createNewChatButton = () => {
    let chatHistory = document.getElementById("chat-history");
    let newChatButton = document.createElement("button");
    newChatButton.id = this.state.currentChatId;
    newChatButton.classList.add("priorChatButton");
    newChatButton.classList.add("active");
    newChatButton.innerText = `Chat ${this.state.chatCount}`; // Removed the username from here
    newChatButton.onclick = this.handlePriorChatClick;
    chatHistory.appendChild(newChatButton);
    newChatButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  debug = () => {
    console.log("chatLog",this.state.chatLog);
    console.log("currentChatThread",this.state.currentChatThread);
    console.log("curentChatId", this.state.currentChatId);
  }

  handleNewChatClick = () => {
    let activeChat = document.getElementsByClassName("active");
    if (activeChat.length > 0) {
      activeChat[0].classList.remove("active");
    }
  
    let newUsername = this.state.newUsername !== "" ? this.state.newUsername : this.state.currentUsername;
  
    this.setState({ currentUsername: newUsername, userNameDisplayed: true }, () => {
      this.startNewChat(newUsername);
      // Don't automatically move to the next agent here
    });
  };

  handleTryAgain = (e) => {
    e.target.remove();
    this.sendMessage();
  }

  handleError = (err) => {
    console.log(err);
    this.createErrorBubble();
  }

  handleEnterKeyDown = async () => {
    let textInput = this.state.textAreaInput;
    if (textInput !== "") {
      if (this.state.currentChatId === null) {
        await this.startNewChat();
      }
  
      const messageContent = textInput; // Get the user's input content
  
      this.setState({
        currentChatThread: [
          ...this.state.currentChatThread,
          { "role": "user", "content": messageContent }
        ],
        textAreaInput: "",
        newUsername: "" // Reset the newUsername state
      }, () => {
        // Reset the agent index to 0 so that Agent1 always starts
        this.setState({ currentAgentIndex: 0, isUserTurn: false }, () => {
          this.sendMessage(); // Get the agent's response
        });
      });
  
      // Pass only the user's input content to the function
      this.createUserChatBubble(messageContent);
    }
  };

  handleTextAreaChange = (event) => {
    this.setState({ textAreaInput: event.target.value});
  }

  handleKeyDown = (event) => {
    if(event.key === 'Enter'){
      event.preventDefault();
      this.handleEnterKeyDown();
    }
  }

  // User's personal attribute modification handlers

  // What happens when the user clicks the "Change Your Name" button
  handleChangeNameClick = () => { 
    this.setState({ changeNameModalVisible: true });
  };

  // What happens when the user types in the "Change Your Name" input box
  handleCloseChangeNameModal = () => {
    this.setState({ changeNameModalVisible: false });
  };

  handleNewUsernameChange = (event) => {
    this.setState({ newUsername: event.target.value });
  };

  handleApplyNewUsername = () => {
    this.setState({ currentUsername: this.state.newUsername, newUsername: "", changeNameModalVisible: false });
  };

  //////////////////////////// End of user personal modification handlers

  // Agent-specific functions

  addSystemMessageForAgent = (agent) => {
    const systemMessage = `You are ${agent.name}, an assistant characterized by: ${agent.characterDescription}.`;
    this.setState(prevState => ({
      currentChatThread: [
        ...prevState.currentChatThread,
        { "role": "system", "content": systemMessage }
      ]
    }));
  };

  ///////////////////////////// End of agent-specific functions
  
  hideLoading() {
    console.log("Trying to hide the loading message...");
    let loadingBubble = document.getElementById("loadingBubble");
    if (loadingBubble) {
      console.log("Found the loading bubble, removing it...");
      loadingBubble.remove();
      this.showRegenerateButton();
    } else {
      console.log("Couldn't find the loading bubble.");
    }
  }
  

  showLoading() {
    let threadDiv = document.getElementById("thread");
    let loadingBubble = document.createElement("div");
    loadingBubble.id = "loadingBubble";
    loadingBubble.classList.add("message");
    loadingBubble.classList.add("loading");
    loadingBubble.innerText = "Thinking...";
    threadDiv.appendChild(loadingBubble);
    loadingBubble.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start'});
  }

  createErrorBubble() {
    let threadDiv = document.getElementById("thread");
    let errorBubble = document.createElement("div");
    errorBubble.classList.add("message");
    errorBubble.classList.add("error");
    errorBubble.innerText = "Something went wrong... click here to try again";
    errorBubble.onclick = this.handleTryAgain;
    threadDiv.appendChild(errorBubble);  
    errorBubble.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start'});
  }

  createGPTChatBubble(agentName, gptInput) {
    let threadDiv = document.getElementById("thread");
    let gptChatBubble = document.createElement("div");
    gptChatBubble.classList.add("message");
    gptChatBubble.classList.add("from-chatbot");
    gptChatBubble.innerHTML = `<strong>${agentName}: </strong>${gptInput}`;
    threadDiv.appendChild(gptChatBubble);
    gptChatBubble.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }


  createUserChatBubble(userInput) {
    const username = this.state.currentUsername;
    const { agents, currentAgentIndex } = this.state;
    const agent = agents[currentAgentIndex];
    
    let threadDiv = document.getElementById("thread");
    let userChatBubble = document.createElement("div");
    userChatBubble.classList.add("message");
    userChatBubble.classList.add("from-user");
    userChatBubble.innerHTML = `<strong>${username}: </strong>${userInput}`;
    threadDiv.appendChild(userChatBubble);
    userChatBubble.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }
  

  
render() {
  return (
      <div className="App">
          <div id="main-container">
              <div id="sidebar">
                  <button
                      id="newChatButton"
                      onClick={this.handleNewChatClick}
                  >
                      + New Chat
                  </button>
                  {this.state.userNameDisplayed && (
                      <div id="user-greeting" className="user-greeting">
                          Welcome, {this.state.currentUsername}
                      </div>
                  )}
                  <button
                      id="changeNameButton"
                      onClick={this.handleChangeNameClick}
                  >
                      Change Your Name
                  </button>
                  <div id="chat-history" />
              </div>
              <div id="chat-container">
                  <div id="thread"></div>
                  <button
                      id="regenerateButton"
                      onClick={this.handleRegenerateClick}
                  >
                      Regenerate
                  </button>
                  <div id="textarea-container">
                      <textarea
                          id="chat-textarea"
                          className="chat-textarea"
                          rows="3"
                          placeholder="Send a message"
                          value={this.state.textAreaInput}
                          onChange={this.handleTextAreaChange}
                          onKeyDown={this.handleKeyDown}
                      />
                  </div>
              </div>
          </div>
          {this.state.changeNameModalVisible && (
              <div className="modal">
                  <div className="modal-content">
                      <h2>Change Your Name</h2>
                      <input
                          type="text"
                          placeholder="Enter your new name"
                          value={this.state.newUsername}
                          onChange={this.handleNewUsernameChange}
                      />
                      <button onClick={this.handleApplyNewUsername}>Apply</button>
                      <button onClick={this.handleCloseChangeNameModal}>Cancel</button>
                  </div>
              </div>
          )}
      </div>
    );
  }


}

export default App;
