const Discord = require('discord.js');
const VotingSettings = require('./VotingEventSettings');
const EntryObject = require('./EntryObject');

module.exports = class VotingEvent{
    constructor(settings = VotingSettings, Client = Discord.Client){
        this.votingName = "";
        this.EntryChannel = '';
        this.VotingChannel = '';
        this.timeUntilStart = 0;
        this.message = Discord.Message;
        this.timeUntilNextVote = 0;
        this.entries = [];
        this.hasStarted = Boolean;
        this.hasEnded = false;
        this.settings = settings;
        this.currentVotingmessage = Discord.Message;
        this.collector = Discord.ReactionCollector;
        this.EntryI = EntryObject;
        this.EntryII = EntryObject;
        this.WinnerEntry = EntryObject;
        this.Client = Client;

        this.IsRunning = false;
        this.UpdateTick = null;
        this.serverRefreshRate = 5000;
    }

    StartUpdateTick() { //?start the update-tick
        this.IsRunning = true;

        console.log("New voting created successfully!");
    
        this.UpdateTick = setInterval(() => {
            this.ServerUpdate();
        }, this.serverRefreshRate);;
    }

    ServerUpdate() { //?global function that runs every 5000ms
        let voting = this; //?js sometimes messes up with this., so we use this to avoid that


        if(voting.hasEnded){
            return;
        }
        
        if(!voting.hasStarted){

            if (voting.message.deleted) {
                voting.QuitEvent();
                return;
            }

            voting.timeUntilStart -= 5;

            if (voting.timeUntilStart != 0 && voting.timeUntilStart > 0) {

                voting.UpdateStartTimer();
            }
            else {
                voting.SetupVoting();
            }

        }
        else{
            this.timeUntilNextVote -= 5;

            if(this.timeUntilNextVote != 0 && this.timeUntilNextVote > 0 && this.currentVotingmessage != null){

                if (this.currentVotingmessage.deleted) {
                    this.QuitEvent();
                    return;
                }

                this.UpdateVotingTimer();
            }
            else{
                this.timeUntilNextVote = 6;
                this.DecideWinner((status)=>{

                    if(status == 4){
                        //?the winner has been found as no entries are left
                        this.EndVoting();
                        return;
                    }

                    if(status == 3){
                        //?there are even amount of votes
                        this.CreateVotingPair();
                        return;
                    }

                    this.CreateVotingPair();
                });
            }
        }
    
    }

    UpdateStartTimer(){ //?Update timer that indicates the time before the voting starts
        let oldEmbed = this.message.embeds[0];
        let newEmbed = new Discord.MessageEmbed();
        let minutes = parseInt(this.timeUntilStart / 60, 10);
        let seconds = parseInt(this.timeUntilStart % 60, 10);
    
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
    
        let NewFormattedTimeString = `${minutes}:${seconds}`;
    
        newEmbed
            .setTitle(oldEmbed.title)
            .setDescription(oldEmbed.description)
            .addField(`Estimated time remaining: ${NewFormattedTimeString}s`, "Make sure to subit your entries before the competition starts!");
    
        this.message.edit(newEmbed);
    }

    SetupVoting(){ //?start the voting in #voting
        let oldEmbed = this.message.embeds[0];
        let newEmbed = new Discord.MessageEmbed();
    
        newEmbed
            .setTitle(oldEmbed.title)
            .setDescription(oldEmbed.description)
            .addField(`Voting has started`, "Voting is starting...");
    
        this.message.edit(newEmbed);
        
        this.hasStarted = true;
    
        let Entrychannel = this.Client.channels.cache.get(this.EntryChannel);
        let allowAttachments = this.settings.allowAttachments;
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
    
                        this.entries.push(entry);
    
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
    
            this.CreateVotingPair();
        });
    }

    CreateVotingPair(){ //?creates the "pair", (a.k.a the two entries in voting channel)
        let Client = this.Client;
        let thisVoting = this;
        let VotingChannel = this.VotingChannel;
        let votingTime = this.settings.votingTime * 1000;
        let VotePair = [];

        let minutes = parseInt(this.timeUntilNextVote / 60, 10);
        let seconds = parseInt(this.timeUntilNextVote % 60, 10);
    
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
    
        let NewFormattedTimeString = `${minutes}:${seconds}`;
        

        console.log(votingTime);
        this.GetVotePair((pair) =>{
            VotePair = pair;
        });
    
        this.EntryI = VotePair[0];
        this.EntryII = VotePair[1];
    
        //?send the entries
    
        let FirstEntry = new Discord.MessageEmbed();
        let SecondEntry = new Discord.MessageEmbed();
        let VotingObject = new Discord.MessageEmbed();
    
        this.Client.users.fetch(VotePair[0].authorID).then((user1)=>{
            this.Client.users.fetch(VotePair[0].authorID).then((user2)=>{
    
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
                    .addField("Entry II", user1.username + " : 2️⃣")
                    .addField("Time for voting remaining:", NewFormattedTimeString);
                Client.channels.cache.get(VotingChannel).bulkDelete(3).then(function(){ //?delete the last posts
                    Client.channels.cache.get(VotingChannel).send(FirstEntry).then(function(){ //?sends the first entry
                        Client.channels.cache.get(VotingChannel).send(SecondEntry).then(function(){ //?sends the second entry
                            Client.channels.cache.get(VotingChannel).send(VotingObject).then(function(message){ //?sends the votingMessage
    
                                thisVoting.currentVotingmessage = message;
        
                                message.react("1️⃣");
                                message.react("2️⃣");
    
                                const filter = (reaction, user) => {
                                    return reaction.emoji.name === '1️⃣' || reaction.emoji.name === '2️⃣';
                                };
    
                                thisVoting.collector = message.createReactionCollector(filter, {time: votingTime*1000});
    
                                thisVoting.collector.on('collect', (reaction, user) => {
                                    console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
    
                                    switch(reaction.emoji.name){
                                        case '1️⃣':
                                            thisVoting.EntryI.votes.push(user.tag);
                                            break;
                                        case '2️⃣':
                                            thisVoting.EntryII.votes.push(user.tag);
                                            break;
                                    }
                                });
                            });
                        });
                    });
                });
                
            });
        });
    }

    UpdateVotingTimer(){ //?updates the timer which indicates the time before the next votins starts
        let oldEmbed = this.currentVotingmessage.embeds[0];
        let newEmbed = new Discord.MessageEmbed();
        let minutes = parseInt(this.timeUntilNextVote / 60, 10);
        let seconds = parseInt(this.timeUntilNextVote % 60, 10);
    
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
    
        let NewFormattedTimeString = `${minutes}:${seconds}`;
    
        newEmbed
            .setTitle(oldEmbed.title)
            .addField(oldEmbed.fields[0].name, oldEmbed.fields[0].value)
            .addField(oldEmbed.fields[1].name, oldEmbed.fields[1].value)
            .addField("Time for voting remaining:", NewFormattedTimeString);
    
        this.currentVotingmessage.edit(newEmbed);
    }

    DecideWinner(callback){ //?checks which entry won and eliminates the other
        let callbackID = 0;

        console.log(this.EntryI.votes.length + " : " + this.EntryII.votes.length);
        if(this.EntryI.votes.length > this.EntryII.votes.length){
            
            this.entries.splice(this.entries.indexOf(this.EntryII), 1);
            callbackID = 1;
        }
        if(this.EntryI.votes.length < this.EntryII.votes.length){

            this.entries.splice(this.entries.indexOf(this.EntryI), 1);
            callbackID = 2;
        }
        if(this.EntryI.votes.length == this.EntryII.votes.length){
            callbackID = 3;
        }
        if(this.entries.length == 1){
            this.WinnerEntry = this.entries[0];
            return callback(4);
        }

        return callback(callbackID);
        
    }

    EndVoting(){
        let channel = this.Client.channels.cache.get(this.VotingChannel);
        let WinnerMessageEmbed = new Discord.MessageEmbed();

        this.Client.users.fetch(this.WinnerEntry.authorID).then((user)=>{

            WinnerMessageEmbed
                .setColor('GREEN')
                .setImage(this.WinnerEntry.attachmentURL)
                .setTitle(`Winner of the ${this.votingName} has been found!`)
                .addField(this.WinnerEntry.TextContent, 'By '+user.tag);

            channel.send(WinnerMessageEmbed);

            this.hasEnded = true;
        });
    }

    QuitEvent(){
        console.log("stopped process");
        clearInterval(this.UpdateTick);
    }

    GetVotePair(callback){ //?takes in array and selects two random items
        let result = [];
        let entries = [...this.entries];
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
    
}