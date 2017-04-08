'use strict';

var Alexa = require('alexa-sdk');
var appId = ''; //TODO: ADD THE APP ID

var states = {
    STARTMODE: '_STARTMODE',  // Prompt the user to start or restart the questions
    QUERYMODE: '_QUERYMODE'  // Clarify or answer the question
};

// Initialize the alexa
exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event ,context);
  alexa.appId = appId;
  alexa.registerHandlers(newSessionHandlers, startModeHandlers, queryModeHandlers);
  alexa.execute();
}

////////////////////////////////////////////////////////////////////////////////
//
//                               Handlers
//
////////////////////////////////////////////////////////////////////////////////

// Stateless handler
var newSessionHandlers = {

     // This will short-cut any incoming intent or launch requests and route them to this handler.
    'NewSession': function() {
        this.handler.state = states.STARTMODE;
        this.emit(':ask', 'Ask me and vex statistics related queries.', 'Do you have any vex statistics related questions?');
    }
};

// Before any query has been asked
var startModeHandlers = Alexa.createStateHandler(states.STARTMODE, {
  'NewSession': function() {
    this.handler.state = '';
    this.emit('NewSession');
  },
  'AMAZON.HelpIntent': function() {
    this.emit(':ask', 'Implement specific command list later',
      'Sorry the developer has been a lazy bum and still forgot to implement a command list');
  },
  'AMAZON.YesIntent': function() {
    this.emit(':ask', 'What is your vex statistics related question?', 'What is your question?');
  },
  'AMAZON.NoIntent': function() {
    this.emit(':tell', "Okay, have a good day");
  },
  'Unhandled': function() {
    this.emit(':ask', 'Sorry, I didn\'t catch that, please try again',
      'I am having trouble understanding you, please ask a valid command, if you ' +
      'want to hear a list of commands say <break strength="medium"> help');
  }
});

// Once a query has already been asked
var queryModeHandlers = Alexa.createStateHandler(states.STARTMODE, {
  'NewSession': function() {
    this.handler.state = '';
    this.emit('NewSession'); // Call initial New Session (stateless version)
  },
  'AMAZON.HelpIntent': function() {
    this.emit(':ask', 'Implement help for each command later',
      'Sorry the developer has been a lazy bum and still forgot to implement specific command help');
  },
  'Unhandled': function() {
    this.emit(':ask', 'Sorry, I didn\'t catch that, please try again', 'Try again please');
  }
});
