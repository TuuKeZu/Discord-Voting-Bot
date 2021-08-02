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

const votingSettings = {
    title: String,
    allowAttachments: Boolean,
    publicAnnoucement: Boolean,
    votingTime: 0,
    startOffset: 0
}
const OnGoingVotingObject = {
    votingName: "",
    timeUntilStart: 0,
    message: Discord.Message,
    timeUntilNextVote: 0,
    entries: [],
    hasStarted: Boolean
}

var CurrentVotings = [];
var IsRunning = false;

//?Syntax-check
Client.on('message', (message) => {
    if (message.channel.id == CommandChannel) {

        if (message.content.startsWith(prefix + 'voting')) {
            let messageContentArray = message.content.trim().split(' ')[2].split(',');
            let voting = votingSettings;

            switch (message.content.trim().split(' ')[1]) {
                case "create":

                    if (messageContentArray[0] != null) {
                        voting.title = messageContentArray[0]; //?title of the voting-event

                        if (messageContentArray[1] == "true" || messageContentArray[0] == "false") {
                            voting.allowAttachments = Boolean(messageContentArray[0]); //?does the voting allow attachments

                            if (messageContentArray[2] == "true" || messageContentArray[1] == "false") {
                                voting.publicAnnoucement = Boolean(messageContentArray[1]); //?will the voting be annoucement

                                if (messageContentArray[3] > 0) {
                                    voting.votingTime = messageContentArray[2]*60; //?time between the votings
                                    console.log(messageContentArray[3]*60);

                                    if (messageContentArray[4] > 0) {
                                        voting.startOffset = messageContentArray[3]*60; //?time before the voting starts
                                        console.log(messageContentArray[4]*60);
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

function SetupVotingEvent(settings = votingSettings, message = Discord.Message) {
    console.log("starting up the voting system...");

    let VotingMessageEmbed = new Discord.MessageEmbed();

    //?calculate the values for minutes/seconds and construct timer in format of {minutes:seconds}.
    let minutes = parseInt(settings.startOffset / 60, 10);
    let seconds = parseInt(settings.startOffset % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    let NewFormattedTimeString = `${minutes}:${seconds}`;

    //?create the embed message for voting event
    VotingMessageEmbed
        .setTitle(votingSettings.title)
        .setDescription(Settings.description)
        .addField(`Estimated time remaining: ${NewFormattedTimeString}s`, "Make sure to subit your entries before the competition starts!");

    //?send that message and add the voting-event on the list. If the list's update tick is not active, set it to active
    message.channel.send(VotingMessageEmbed).then(messageObject => {

        let VotingEvent = OnGoingVotingObject;

        VotingEvent.timeUntilStart = settings.startOffset;
        VotingEvent.hasStarted = false;
        VotingEvent.entries = [];
        VotingEvent.message = messageObject;

        CurrentVotings.push(VotingEvent);

        if (!IsRunning) {
            StartUpdateTick();
        }

    });
}


function StartUpdateTick() {
    IsRunning = true;

    setInterval(() => {
        ServerUpdate();
    }, 10000);
}

function ServerUpdate() {
    //for each on going voting-event
    CurrentVotings.forEach(function (votingEvent, index) {
        //if the voting-message has been deleted
        if(votingEvent.message.deleted){
            RemoveVotingEvent(index);
            return;
        }

        //timer for the function, which refreshes every 10s
        votingEvent.timeUntilStart -= 10;

        let oldEmbed = votingEvent.message.embeds[0];
        let newEmbed = new Discord.MessageEmbed();
        let minutes = parseInt(votingEvent.timeUntilStart / 60, 10);
        let seconds = parseInt(votingEvent.timeUntilStart % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        let NewFormattedTimeString = `${minutes}:${seconds}`;

        //if the timer havent reached zero, set the message's timer-text to match the time before the voting starts
        if (votingEvent.timeUntilStart != 0 && votingEvent.timeUntilStart > 0) {
            newEmbed
                .setTitle(oldEmbed.title)
                .setDescription(oldEmbed.description)
                .addField(`Estimated time remaining: ${NewFormattedTimeString}s`, "Make sure to subit your entries before the competition starts!");

            votingEvent.message.edit(newEmbed);
        }
        else {

        }
    });
}

function RemoveVotingEvent(index){
    CurrentVotings.splice(index, 1);
    console.log("removed votingEvent from the list");
}

function ReturnError(message = Discord.Message, errorType, argument, command) {
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