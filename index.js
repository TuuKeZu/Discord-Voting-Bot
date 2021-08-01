const Discord = require('discord.js');
const Client = new Discord.Client();

const Settings = require('./settings.json');


Client.once('ready', ()=>{
    console.log('ready!');
});






Client.login(Settings.token);
