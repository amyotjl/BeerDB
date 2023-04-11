/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const firebase = require('firebase/app');
require("firebase/database");

const {
  getRequestType,
  getIntentName,
  getSlotValue,
  getDialogState,
} = require('ask-sdk-core');


const firebaseConfig = {
  apiKey: "AIzaSyDz0_PLLiojGTuf7oG0iZcMWuxAR1_M21I",
  authDomain: "beerdb-6f55a.firebaseapp.com",
  databaseURL: "https://beerdb-6f55a-default-rtdb.firebaseio.com",
  projectId: "beerdb-6f55a",
  storageBucket: "beerdb-6f55a.appspot.com",
  messagingSenderId: "443207994655",
  appId: "1:443207994655:web:9c3fc13c524f856ef9b42a",
  measurementId: "G-7P1HD8M2SZ"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'BeerDB listening. You can add a beer to the database or ask if a beer already exists in it.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const levenshteinDistance = (str1 = '', str2 = '') => {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return track[str2.length][str1.length];
}

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const AddBeerIntentHandler = {
    canHandle(handlerInput){
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'addBeer';
    },
    async handle(handlerInput){
        var speakOutput = "";
        const beerName = getSlotValue(handlerInput.requestEnvelope, "name");
        const beerFormat = getSlotValue(handlerInput.requestEnvelope, "format");
        const beerType = getSlotValue(handlerInput.requestEnvelope, "type");
        const beerDescription = getSlotValue(handlerInput.requestEnvelope, "description");
        const beerAlcoolLevel = getSlotValue(handlerInput.requestEnvelope, "alcoolLevel");
        const beerBrewery = getSlotValue(handlerInput.requestEnvelope, "brewery");
        const beerRating = getSlotValue(handlerInput.requestEnvelope, "rating");
        
        if (beerName !== undefined && beerRating !== undefined){
            try{
                db.goOnline();
                const beer = {
                    name: beerName,
                    rating: beerRating, 
                    type: beerType || "",
                    alcoolLevel: beerAlcoolLevel || "",
                    brewery: beerBrewery || "",
                    description: beerDescription || "",
                    format: beerFormat || ""
                }
                await db.ref('/Beers/'+beerName).set(beer);
                db.goOffline();
                speakOutput = `I have saved ${beerName} in my database. You can now retrieve the information given.`;
            }catch(error){
                console.log(error)
                return handlerInput.responseBuilder
                .speak("error")
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
                .getResponse();
            }
        }

        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const getBeerHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'getBeer';
    },
    async handle(handlerInput) {
        // console.log('IN GETBEER INTENT')
        var speakOutput = 'Hello World!';
        const beerName = getSlotValue(handlerInput.requestEnvelope, "name");
        db.goOnline();
        const ref = db.ref('Beers');
        const snap = await ref.once('value');
        const values = snap.val();
        db.goOffline();

        if (beerName in values) {
            speakOutput = `You did drink ${beerName} before. You rated it ${values[beerName]['rating']} out of ten`;
            console.log(speakOutput);
        }
        else {
            const edit_dist = {};
            Object.entries(values).forEach(([key, _]) => {
                edit_dist[key] = levenshteinDistance(key, beerName);
            });
            let key = Object.keys(edit_dist).reduce((key, v) => edit_dist[v] < edit_dist[key] ? v : key);
            if (edit_dist[key] <= 3) {
                console.log(key, edit_dist[key])
                speakOutput = `I did not find an exact macth for ${beerName}. The closest beer I found is ${key}. You rated it ${values[key]['rating']} out of ten`;
                console.log(speakOutput)
                
            }
                
            else {
                speakOutput = `I don't think you ever drank the beer ${beerName}.`;
                console.log(speakOutput)
            } 
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};




const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        AddBeerIntentHandler,
        getBeerHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();