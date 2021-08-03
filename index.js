const Discord = require('discord.js');
const Client = new Discord.Client();

const Settings = require('./settings.json');

Client.once('ready', () => {
    console.log('ready!');

});


//todo Hard-coded values for test-server. Will be changed to dynamic later
const serverID = '871464219332210770';
const EntryChannelID = '871667233888301117';
const VotingChannelID = '871667254226481152';
const CommandChannel = '871464528532111550';
const ManagerRoleID = '871669022532444160';
const participantRoleID = '871668949459279882';
var prefix = '!';

class votingSettings{
    constructor(){
        this.title = String;
        this.allowAttachments = Boolean;
        this.publicAnnoucement = Boolean;
        this.votingTime = 0;
        this.startOffset = 0;
    }   
}
class OnGoingVotingObject {
    constructor(){
        this.votingName = "";
        this.EntryChannel = '';
        this.VotingChannel = '';
        this.timeUntilStart = 0;
        this.message = Discord.Message;
        this.timeUntilNextVote = 0;
        this.entries = [];
        this.hasStarted = Boolean;
        this.settings = votingSettings;
        this.currentVotingmessage = Discord.Message;
        this.EntryI = [];
        this.EntryII = [];
    }
}
class EntryObject {
    constructor() {
        this.authorID = '';
        this.attachmentURL = '';
        this.TextContent = '';
    }
}

var CurrentVotings = [];
var IsRunning = false;



Client.on('message', (message) => { //?coammand-handeler
    
    if (message.channel.id == CommandChannel) {
        if (message.content.startsWith(prefix + 'voting')) {
            let messageContentArray = message.content.trim().split(' ')[2].split(',');
            let voting = new votingSettings();
            switch (message.content.trim().split(' ')[1]) {
                case "create":

                    if (messageContentArray[0] != null) {
                        voting.title = messageContentArray[0]; //?title of the voting-event

                        if (messageContentArray[1] == "true" || messageContentArray[0] == "false") {
                            voting.allowAttachments = Boolean(messageContentArray[0]); //?does the voting allow attachments

                            if (messageContentArray[2] == "true" || messageContentArray[1] == "false") {
                                voting.publicAnnoucement = Boolean(messageContentArray[1]); //?will the voting be annoucement

                                if (messageContentArray[3] > 0) {
                                    voting.votingTime = messageContentArray[3] * 60; //?time between the votings
                                    console.log(voting.votingTime);

                                    if (messageContentArray[4] > 0) {
                                        voting.startOffset = messageContentArray[3] * 60; //?time before the voting starts
                                        console.log(messageContentArray[4] * 60);
                                        SetupVotingEvent(voting, message);
                                    }
                                    else {
                                        ReturnError(message, 3, 4);
                                    }

                                }
                                else {
                                    ReturnError(message, 3, 3);
                                }

                            }
                            else {
                                ReturnError(message, 1, 2, Settings.commands.create_voting);
                            }

                        }
                        else {
                            ReturnError(message, 1, 1, Settings.commands.create_voting);
                        }

                    }
                    else {
                        ReturnError(message, 1, 0, Settings.commands.create_voting);
                    }
                    break;

                default:
                    ReturnError(message, 0);
                    break;
            }
        }

    }
});

Client.on('messageReactionAdd', (reaction, user, message)=>{
    
});

function SetupVotingEvent(settings = votingSettings, message = Discord.Message) { //?first setup; creates and starts the countdown for voting
    console.log("starting up the voting system...");

    let VotingMessageEmbed = new Discord.MessageEmbed();


    let minutes = parseInt(settings.startOffset / 60, 10);
    let seconds = parseInt(settings.startOffset % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    let NewFormattedTimeString = `${minutes}:${seconds}`;


    VotingMessageEmbed
        .setTitle(settings.title)
        .setDescription(Settings.description)
        .addField(`Estimated time remaining: ${NewFormattedTimeString}s`, "Make sure to subit your entries before the competition starts!");

    message.channel.send(VotingMessageEmbed).then(messageObject => {

        let VotingEvent = new OnGoingVotingObject();

        VotingEvent.timeUntilStart = settings.startOffset;
        VotingEvent.timeUntilNextVote = settings.votingTime;
        VotingEvent.hasStarted = false;
        VotingEvent.entries = [];
        VotingEvent.message = messageObject;
        VotingEvent.EntryChannel = EntryChannelID;
        VotingEvent.VotingChannel = VotingChannelID;

        VotingEvent.settings = settings;

        CurrentVotings.push(VotingEvent);

        if (!IsRunning) {
            StartUpdateTick();
        }

    });
}


function StartUpdateTick() { //?start the update-tick
    IsRunning = true;

    setInterval(() => {
        ServerUpdate();
    }, 5000);
}

function ServerUpdate() { //?global function that runs every 5000ms

    CurrentVotings.forEach(function (votingEvent, index) {
        if (votingEvent.message.deleted) {
            RemoveVotingEvent(index);
            return;
        }

        if(!votingEvent.hasStarted){

            votingEvent.timeUntilStart -= 5;

            if (votingEvent.timeUntilStart != 0 && votingEvent.timeUntilStart > 0) {
                UpdateStartTimer(votingEvent);
            }
            else {
                SetupVoting(votingEvent);
            }

        }
        else{
            votingEvent.timeUntilNextVote -= 5;
            console.log(votingEvent.timeUntilNextVote);

            if(votingEvent.timeUntilNextVote != 0 && votingEvent.timeUntilNextVote > 0){
                
            }
            else{
                CreateVotingPair(votingEvent);
                votingEvent.votingTime = votingEvent.settings.votingTime;
            }
            
        }
    });
}

function UpdateStartTimer(votingEvent = OnGoingVotingObject){ //?Update timer that indicates the time before the voting starts
    let oldEmbed = votingEvent.message.embeds[0];
    let newEmbed = new Discord.MessageEmbed();
    let minutes = parseInt(votingEvent.timeUntilStart / 60, 10);
    let seconds = parseInt(votingEvent.timeUntilStart % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    let NewFormattedTimeString = `${minutes}:${seconds}`;

    newEmbed
        .setTitle(oldEmbed.title)
        .setDescription(oldEmbed.description)
        .addField(`Estimated time remaining: ${NewFormattedTimeString}s`, "Make sure to subit your entries before the competition starts!");

    votingEvent.message.edit(newEmbed);
}

function SetupVoting(votingEvent = OnGoingVotingObject){ //?start the voting in #voting
    let oldEmbed = votingEvent.message.embeds[0];
    let newEmbed = new Discord.MessageEmbed();

    newEmbed
        .setTitle(oldEmbed.title)
        .setDescription(oldEmbed.description)
        .addField(`Voting has started`, "Voting is starting...");

    votingEvent.message.edit(newEmbed);
    
    votingEvent.hasStarted = true;

    let Entrychannel = Client.channels.cache.get(EntryChannelID);
    let allowAttachments = votingEvent.settings.allowAttachments;
    let EntryCount = 0;

    Entrychannel.messages.fetch({ limit: 99 }).then(messages => {
        console.log("Message cache completed : " + messages.size + " entries were found");

        messages.forEach(message => {

            let messageAttachments = message.attachments;

            if (allowAttachments) {

                if (messageAttachments.array()[0] != null) {

                    let entry = new EntryObject();

                    entry.authorID = message.author.id;
                    entry.attachmentURL = messageAttachments.array()[0].url;

                    if (message.content != null) {
                        entry.TextContent = message.content;
                    }

                    votingEvent.entries.push(entry);

                    EntryCount++;

                }

            }
            else {
                if (messageAttachments.array()[0] == null) {

                    if (message.content != null) {
                        let entry = new EntryObject();

                        entry.authorID = message.author.id;
                        entry.TextContent = message.content;
                    }

                    EntryCount++;
                }
            }
        })

        CreateVotingPair(votingEvent);
    });
}

function CreateVotingPair(votingEvent = OnGoingVotingObject){
    let VotePair = [];

    GetVotePair(votingEvent.entries, (pair) =>{
        VotePair = pair;
    });

    votingEvent.EntryI = VotePair[0];
    votingEvent.EntryII = VotePair[1];

    //?send the entries

    let FirstEntry = new Discord.MessageEmbed();
    let SecondEntry = new Discord.MessageEmbed();
    let VotingObject = new Discord.MessageEmbed();

    Client.users.fetch(VotePair[0].authorID).then((user1)=>{
        Client.users.fetch(VotePair[0].authorID).then((user2)=>{

            FirstEntry
                .setImage(VotePair[0].attachmentURL)
                .addField(VotePair[0].TextContent, "By "+user1.username)
                .setTitle("Entry I");
            SecondEntry
                .setImage(VotePair[1].attachmentURL)
                .addField(VotePair[0].TextContent, "By "+user2.username)
                .setTitle("Entry II");
            
            VotingObject
                .setTitle("Which one is better?")
                .addField("Entry I", user1.username + " : 1️⃣")
                .addField("Entry II", user1.username + " : 2️⃣");

            Client.channels.cache.get(votingEvent.VotingChannel).send(FirstEntry).then(function(){ //?sends the first entry
                Client.channels.cache.get(votingEvent.VotingChannel).send(SecondEntry).then(function(){ //?sends the second entry
                    Client.channels.cache.get(votingEvent.VotingChannel).send(VotingObject).then(function(message){ //?sends the votingMessage
                        votingEvent.CurrentVotingMessage = message;

                        message.react("1️⃣");
                        message.react("2️⃣");
                    });
                });
            });
            
        });
    });
}

function DecideWinner(votingEvent = OnGoingVotingObject, callback){
    let entries = votingEvent.entries;
    let reactionList = votingEvent.currentVotingmessage.reactions.cache;
    let VotesI = reactionList.get('1️⃣');
    let VotesII = reactionList.get('2️⃣');

    console.log(VotesI + " vs " + VotesII);

    if(parseInt(VotesI) > parseInt(VotesII)){
        //option 1 got more votes
    }
    else{
        //option 2 got more votes
    }

}

function GetVotePair(array = [], callback){ //?takes in array and selects two random items
    let result = [];
    let entries = array;
    let randomIndexOne = Math.floor(Math.random() * entries.length)

    console.log(randomIndexOne + " from lenght of " + entries.length)

    result[0] = entries[randomIndexOne];
    entries.splice(randomIndexOne, 1);

    let randomIndexTwo = Math.floor(Math.random() * entries.length)

    console.log(randomIndexTwo + " from lenght of " + entries.length)

    result[1] = entries[randomIndexTwo];
    entries.splice(randomIndexTwo, 1);

    return callback(result);
}

function RemoveVotingEvent(index) { //?removes the VotingEvent from global update-tick
    CurrentVotings.splice(index, 1);
    console.log("removed votingEvent from the list");
}

function ReturnError(message = Discord.Message, errorType, argument, command) { //?error-handling
    /* Types:
        0. datal syntax error
        1. syntax error
        2. missing permissions
        3. invalid values for arguments
    */

    var ErrorEmbed = new Discord.MessageEmbed();

    switch (errorType) {
        case 0:
            ErrorEmbed
                .addField("Please specify what you want to do!", "For list of commands and guide for setup use '" + prefix + "help'");
            break;
        case 1:
            ErrorEmbed
                .setTitle("Invalid arguments!")
                .addField("Correct syntax:", command.syntax)
                .addField("Example of the command:", command.example)
                .setFooter("Error with argument " + argument);
            break;
        case 2:
            ErrorEmbed
                .setTitle("You dont have permissions to use this command!");
            break;
        case 3:
            ErrorEmbed
                .setTitle("Invalid values!")
                .addField("Correct syntax:", command.syntax)
                .addField("Example of the command:", command.example)
                .setFooter("Error with argument " + argument);
            break;
    }

    ErrorEmbed.setColor('RED');
    message.channel.send(ErrorEmbed);
}

//?setup the bot with token found from settings.json
Client.login(Settings.token);