'use strict';

var Alexa = require('alexa-sdk');
var https = require('https');
var appId = ''; //TODO: ADD THE APP ID

var states = {
    STARTMODE: '_STARTMODE',  // Prompt the user to start or restart the questions
    QUERYMODE: '_QUERYMODE'  // Clarify or answer the question
};

var commands = {
  RANK: '_RANK'
}

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
        if(this.event.request.type != "IntentRequest")
          this.emit(':ask', 'Ask me any vex statistics related queries.', 'Do you have any vex statistics related questions?');
        else
          this.emit(this.event.request.intent.name);
    },
    'LaunchRequest': function() {
      this.emit('NewSession');
    },
    'RankIntent': function() {
      rankReq(this);
    },
    'RankNLIntent': function() {
      rankReq(this);
    },
    'Error': function() {
      this.emit(':tell', 'Sorry, a fatal error occured when attempting to fufill this request, please try again later');
    }
};

// Before any query has been asked
var startModeHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
  'NewSession': function() {
    this.handler.state = '';
    this.emit('NewSession');
  },
  'RankIntent': function() {
    rankReq(this);
  },
  'RankNLIntent': function() {
    rankReq(this);
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
  'Error': function() {
    this.handler.state = '';
    this.emit('Error');
  },
  'Unhandled': function() {
    this.emit(':ask', 'Sorry, I didn\'t catch that, please try again',
      'I am having trouble understanding you, please ask a valid command, if you ' +
      'want to hear a list of commands say <break strength="medium"> help');
  }
});

// Once a query has already been asked
var queryModeHandlers = Alexa.CreateStateHandler(states.QUERYMODE, {
  'NewSession': function() {
    this.handler.state = '';
    this.emit('NewSession'); // Call initial New Session (stateless version)
  },
  'AMAZON.HelpIntent': function() {
    this.emit(':ask', 'Implement help for each command later',
      'Sorry the developer has been a lazy bum and still forgot to implement specific command help');
  },
  'RankIntent': function() {
    rankReq(this);
  },
  'RankNLIntent': function() {
    rankReq(this);
  },
  'Error': function() {
    this.handler.state = '';
    this.emit('Error');
  },
  'Unhandled': function() {
    this.emit(':ask', 'Sorry, I didn\'t catch that, please try again', 'Try again please');
  }
});

////////////////////////////////////////////////////////////////////////////////
//
//                            Helper Methods
//
////////////////////////////////////////////////////////////////////////////////

// "Class" for making requests to vexdb
function VexReq(url,alexa) {
  this.url = url;
  this.getResponse = function(location, callback) {
    var Url = location || url;
    https.get(Url, (res) => {
      var rawData = '';
      res.on('data', (d) => rawData += d);
      res.on('end', () => {
        try {
          callback(JSON.parse(rawData));
        } catch (e) {
          console.error(e);
          alexa.emit('Error');
        }
      });
    }).on('error', (e) => {
      console.error(e);
      alexa.emit('Error');
    });
  };
  this.requestWithParams = function(location,callback) {
    var Url = location || url;
    var args = Array.from(arguments);
    // i starts at 1 to skip location and callback
    for(var i = 2; i < args.length; i ++) {
      if(i == 2 && !Url.includes("?")) {
        Url += "?";
      } else {
        Url += "&";
      }
      Url+=args[i];
    }
    this.getResponse(Url, function(data) {
      callback(data);
    })
  };
  this.getFullResponse = function(callback,location) {
    var Url = location || url;
    var obj = this;
    this.requestWithParams(Url, function(data) {
      var length = data.size;
      var output = {"status":1,"size":0,"result":[]};
      obj.waitForFullResponse(length, 0, Url, output, obj, function(newLength, newOutput) {
        output.size = newLength;
        callback(newOutput);
      })
    },'nodata=true');
  };
  this.waitForFullResponse = function(length, countedLen, Url, output, thisObj, callback) {
    if(countedLen < length) {
      thisObj.requestWithParams(Url, function(data) {
        countedLen += data.size;
        output.result = output.result.concat(data.result);
        thisObj.waitForFullResponse(length, countedLen, Url, output, thisObj, callback);
      },'limit_start' + countedLen);
    } else {
      callback(countedLen, output);
    }
  }
}

// function to be called for every request which does some setting up
function startReq(alexa,command) {
  alexa.handler.state = states.QUERYMODE;
  alexa.attributes["lastCommand"] = command;
  //TODO: Add more setup XD
}

// Gets the slot values from a request
function getParams(alexa) {
  var slots = alexa.event.request.intent.slots;
  var output = [];
  for(var param in slots)
    output.push(slots[param].value);
  return output;
}

// Checks if the inputted team is valid
function isValidTeam(teamName) {
  return (teamName.replace(/[^A-Z]/gi, "").length < 2 && teamName.length <= 7);
}

// Get the digits of a vex team
function getDigits(team) {
  var output = "";
  for(var i = 0; i < team.length; i ++)
    if(!isNaN(team.charAt(i)))
      output += team.charAt(i);
  return output;
}

// Get the letter of a vex team
function getLetter(team) {
  return team.replace(/[^A-Z]/gi, "");
}

// Get the SSML representation of a vex team
function sayTeam(team) {
  var output = '<say-as interpret-as="digits">' + getDigits(team) + '</say-as>';
  var letter = getLetter(team);
  if(letter != "")
    output += ' <say-as interpret-as="characters">' + getLetter(team) + '</say-as>';
  return output;
}

////////////////////////////////////////////////////////////////////////////////
//
//                          Intent Handling Methods
//
////////////////////////////////////////////////////////////////////////////////

function rankReq(alexa) {
  startReq(alexa,commands.RANK);
  var params = getParams(alexa);
  var teamNum = params[0];
  var teamLetter = params[1];
  teamLetter = (teamLetter == undefined) ? "" : teamLetter;
  var team = teamNum + teamLetter;
  if(isValidTeam(team)) {
    var req = new VexReq("https://api.vexdb.io/v1/get_skills?type=2&season=Starstruck&season_rank=true&team=" + team, alexa);
    req.getFullResponse((res) => {
      if(res.size > 0) {
        var rank = res.result[0].season_rank;
        alexa.handler.state = states.STARTMODE;
        // Send the data or say nothing could be found
        alexa.emit(":ask", sayTeam(team) + " is rank " + rank + " in the world.  " +
          "Do you have another query?" , "Do you have another question?");
      } else {
        alexa.handler.state = states.STARTMODE;
        alexa.emit(":ask", "Could not find skills data for team " + sayTeam(team) +
          ".  Do you have another query?", "Do you have another question?");
      }
    });
  } else {
    alexa.emit(":ask", sayTeam(team) + " is not a valid team.  Please say a valid team.", "Please say a valid team number.");
  }
}
