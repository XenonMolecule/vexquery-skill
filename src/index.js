'use strict';

var Alexa = require('alexa-sdk');
var https = require('https');
var appId = ''; //TODO: ADD THE APP ID

const SEASON = {'value':'Starstruck'}; // This format simplifies things later

var states = {
    STARTMODE: '_STARTMODE',  // Prompt the user to start or restart the questions
    QUERYMODE: '_QUERYMODE'  // Clarify or answer the question
};

var commands = {
  RANK: '_RANK',
  AWARDS: '_AWARDS',
  AWARDS_LIST: '_AWARDS_LIST'
}

var breaks = {
  NONE: '<break strength="none"/>',
  MEDIUM: '<break strength="medium"/>',
  STRONG: '<break strength="strong"/>',
  XSTRONG: '<break strength="x-strong"/>'
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
    'AwardsIntent': function() {
      awardReq(this);
    },
    'AwardsListIntent': function() {
      awardsListReq(this);
    },
    'AwardsNLIntent': function() {
      this.emit('AwardsIntent');
    },
    'AwardsListNLIntent': function() {
      this.emit('AwardsListIntent');
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
  'AwardsIntent': function() {
    awardReq(this);
  },
  'AwardsListIntent': function() {
    awardsListReq(this);
  },
  'AwardsNLIntent': function() {
    this.emit('AwardsIntent');
  },
  'AwardsListNLIntent': function() {
    this.emit('AwardsListIntent');
  },
  'AMAZON.HelpIntent': function() {
    this.emit(':ask', 'Implement specific command list later',
      'Sorry the developer has been a lazy bum and still forgot to implement a command list');
  },
  'AMAZON.YesIntent': function() {
    switch(this.attributes["lastCommand"]) {
      case commands.AWARDS :
        this.emit('AwardsListIntent');
        break;
      default:
        this.emit(':ask', 'What is your vex statistics related question?', 'What is your question?');
    }
  },
  'AMAZON.NoIntent': function() {
    switch(this.attributes["lastCommand"]) {
      case commands.AWARDS :
        this.attributes["lastCommand"] = "";
        this.emit(':ask', "Okay, do you have any other questions?", "Do you have another question?");
        break;
      default:
        this.emit(':tell', "Okay, have a good day");
    }
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
  'AwardsIntent': function() {
    awardReq(this);
  },
  'AwardsListIntent': function() {
    awardsListReq(this);
  },
  'AwardsNLIntent': function() {
    this.emit('AwardsIntent');
  },
  'AwardsListNLIntent': function() {
    this.emit('AwardsListIntent');
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

// Gets the team from the alexa request slots
function getTeam(alexa) {
  var slots = alexa.event.request.intent.slots;
  var teamNum = slots.TeamNum.value;
  var teamLetter = slots.TeamLetter;
  teamLetter = (teamLetter == undefined) ? {"value" : ""} : teamLetter;
  return teamNum + teamLetter.value;
}

// Safe version of getTeam, won't crash if no team number
function getTeamSafe(alexa) {
  var slots = alexa.event.request.intent.slots || {};
  var teamNum =  slots.TeamNum || {"value" : ""};
  var teamLetter = slots.TeamLetter || {"value" : ""};
  return teamNum.value + teamLetter.value;
}

// Remove (VRC/VEXU) from award title
function removeExtraName(award) {
  return award.replace(/\(VRC\/VEXU\)/gi, "").trim();
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
  alexa.attributes["lastTeam"] = team;
  if(isValidTeam(team)) {
    var req = new VexReq("https://api.vexdb.io/v1/get_skills?type=2&season=Starstruck&season_rank=true&team=" + team, alexa);
    req.getFullResponse((res) => {
      alexa.handler.state = states.STARTMODE;
      if(res.size > 0) {
        var rank = res.result[0].season_rank;
        alexa.emit(":ask", sayTeam(team) + " is rank " + rank + " in the world.  " +
          "Do you have another query?" , "Do you have another question?");
      } else {
        alexa.emit(":ask", "Could not find skills data for team " + sayTeam(team) +
          ".  Do you have another query?", "Do you have another question?");
      }
    });
  } else {
    alexa.emit(":ask", sayTeam(team) + " is not a valid team.  Please say a valid team.", "Please say a valid team number.");
  }
}

function awardReq(alexa) {
  startReq(alexa, commands.AWARDS);
  var team = getTeam(alexa);
  var season = alexa.event.request.intent.slots.Season || SEASON;
  season = season.value;
  alexa.attributes["lastTeam"] = team;
  if(isValidTeam(team)) {
    var req = new VexReq("https://api.vexdb.io/v1/get_awards?season=" + season + "&nodata=true&team=" + team, alexa);
    req.getFullResponse((res) => {
      alexa.handler.state = states.STARTMODE;
      if(res.size > 0) {
        var plural = (res.size == 1) ? "" : "s";
        alexa.emit(":ask", sayTeam(team) + " has won " + res.size + " award" + plural +
          " in the " + season + " season.  Would you like me to list them?", "Would you like " +
          "me to list the " + res.size + " award" + plural + " of " + sayTeam(team) + "?");
      } else {
        alexa.attributes["lastCommand"] = "";
        alexa.emit(":ask", "Could not find awards data for team " + sayTeam(team) +
          ".  Do you have another query?", "Do you have another question?");
      }
    });
  } else {
    alexa.emit(":ask", sayTeam(team) + " is not a valid team.  Please say a valid team.", "Please say a valid team number.");
  }
}

function awardsListReq(alexa) {
  startReq(alexa, commands.AWARDS_LIST);
  var team = getTeamSafe(alexa);
  team = (team!="") ? team : alexa.attributes["lastTeam"];
  var slots = alexa.event.request.intent.slots || {};
  var season = slots.Season || SEASON;
  season = season.value;
  alexa.attributes["lastTeam"] = team;
  if(isValidTeam(team)) {
    var req = new VexReq("https://api.vexdb.io/v1/get_awards?season=" + season + "&team=" + team, alexa);
    req.getFullResponse((res) => {
      alexa.handler.state = states.STARTMODE;
      if(res.size > 0) {
        var plural = (res.size == 1) ? "" : "s";
        var list = "";
        for (var i = 0; i < res.result.length; i ++) {
          if(i == res.size-1 && res.size!= 1) {
            list += "and ";
          }
          list += removeExtraName(res.result[i].name) + ((i!=res.size-1) ? " " + breaks.MEDIUM + " ": "");
        }
        alexa.emit(":ask", sayTeam(team) + " won " + list + " during the " + season +
          " season, making " + res.size + " award" +  plural + " in total.  Do you have another query?",
          "Do you have another question?");
      } else {
        alexa.attributes["lastCommand"] = "";
        alexa.emit(":ask", "Could not find awards data for team " + sayTeam(team) +
          ".  Do you have another query?", "Do you have another question?");
      }
    });
  }
}
