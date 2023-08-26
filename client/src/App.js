import React, { Component } from 'react';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import './App.css';
import './Chat.css';

class App extends Component {
  
  state = {
    currentUsername: "You:", // Default username, can be changed by user
    changeNameModalVisible: false,
    newUsername: "",
    userNameDisplayed: false,
    textAreaInput: "",
    chatLog: {},
    chatCount: 0,
    currentChatId: null,
    currentChatThread: [],

    // Agents are defined here:
    agents: [
      {
        name: "Agent1",
        characterDescription: "Creative and Imaginative, unconstrained by the boundaries of reality and nonfiction",
        delay: 1000, // in milliseconds
        thoughts: [], // Private internal thoughts of the agent
        tools: [], // Tools the agent has access to
        // Add other agent-specific properties here
      },
      {
        name: "Agent2",
        characterDescription: "Rules Follower that is very precise and will quote the law, rules, and regulations to you",
        delay: 2000,
        thoughts: [],
        tools: [],
        // Add other agent-specific properties here
      },
      // Add more agents as needed
    ],
    currentAgentIndex: 0, // The index of the agent currently being processed
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
    this.showLoading();
    this.callBackendAPI()
      .then(res => this.setState({ currentChatThread: [...this.state.currentChatThread, {"role": "assistant", "content": res.data}]}, this.createGPTChatBubble(res.data)))
      .then(() => {
        this.setState(prevState => {
          let chatLog = prevState.chatLog
          chatLog[prevState.currentChatId] = prevState.currentChatThread;
          return { chatLog }
        })
        this.hideLoading();
      })
      .catch(err => {
        this.hideLoading();
        this.handleError(err);
      });
  }

  clearThread = () => {
    let thread = document.getElementById("thread");
    while (thread.firstChild) {
      thread.removeChild(thread.firstChild);
    }
    this.setState({ currentChatThread: [] });
  }

  populateThread = () => {
    let chatThread = this.state.chatLog[this.state.currentChatId];
    if (chatThread){
      this.setState({ currentChatThread: chatThread });
      chatThread.forEach(msg => {
        if (msg.role === "user"){
          this.createUserChatBubble(msg.content);
        }
        if (msg.role === "assistant"){
          this.createGPTChatBubble(msg.content);
        }
        this.showRegenerateButton();
      });
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
    let thread = document.getElementById("thread");
    thread.removeChild(thread.lastChild);
    let chatThread = this.state.currentChatThread;
    chatThread.pop();
    this.setState({ currentChatThread: chatThread }, this.sendMessage)
  }

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

    // Set the username based on the user-set username or default to "You"
    let newUsername = this.state.newUsername !== "" ? this.state.newUsername : this.state.currentUsername; // Use the current username if no new one is provided

    this.setState({ currentUsername: newUsername, userNameDisplayed: true }, () => {
        this.startNewChat(newUsername); // Pass the chosen username
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
            currentChatThread: [...this.state.currentChatThread, { "role": "user", "content": messageContent }],
            textAreaInput: "",
            newUsername: "", // Reset the newUsername state
        }, this.sendMessage);

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

  // Personal modification handlers

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


  hideLoading() {
    let loadingBubble = document.getElementById("loadingBubble");
    if (loadingBubble){
      loadingBubble.remove();
      this.showRegenerateButton();
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

  createGPTChatBubble(gptInput) {
    let threadDiv = document.getElementById("thread");
    let gptChatBubble = document.createElement("div");
    gptChatBubble.classList.add("message");
    gptChatBubble.classList.add("from-chatbot");
    gptChatBubble.innerText = gptInput;
    threadDiv.appendChild(gptChatBubble);  
    gptChatBubble.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start'});
  }

  createUserChatBubble(userInput) {
    const username = this.state.currentUsername; // Use the chosen username
    let threadDiv = document.getElementById("thread");
    let userChatBubble = document.createElement("div");
    userChatBubble.classList.add("message");
    userChatBubble.classList.add("from-user");
    userChatBubble.innerText = `${username}: ${userInput}`; // Prepend the username
    threadDiv.appendChild(userChatBubble);  
    userChatBubble.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start'});
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
