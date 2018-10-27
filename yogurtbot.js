const { Client, Util }= require('discord.js');
const ayarlar = require('./ayarlar.json')
const ytdl = require('ytdl-core')
const moment = require('moment');
const yapımcı = ayarlar.yapımcı;
const client = new Client;


const YouTube = require('simple-youtube-api');

const youtube = new YouTube(ayarlar.GOOGLE_API_KEY);

var PREFIX = ayarlar.prefix;

const queue = new Map();

client.on('ready', () => {
    console.log('Müzik Botu Giriş Yaptı')

    client.user.setActivity('Bir Müzik',{type: 'LISTENING'});
}); 
function searchVideos(query, limit = 5, options = {}) {
    return this.search(query, limit, Object.assign(options, { type: 'video' }));
}
client.on('message', async msg => { // eslint-disable-line
    console.log(`${msg.guild.name} = ${msg.channel.name} kanalında ${msg.author.tag} = ${msg.content}`);

	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)

	if (command === 'play' || command === 'p') {
        if(!msg.member.roles.find("name","♪♪MÜZÜKÇÜ♪♪")) return msg.channel.sendMessage('Sadece Müzükçü Yapabilir!');
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('Bir Müzik Kanalına Gir!');
		if(!searchString) return msg.channel.send("Bir Müzik Adı Gir!")
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('Bir Müzik Kanalına Gir!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('Bir Müzik Kanalına Gir!');
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`✅ Playlist: **${playlist.title}** Listeye Eklendi!`);
		} else {
			try {
				var video = await youtube.getVideo(url);  
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					
					
					msg.channel.send(`
__**Şarkı Seçimi:**__
${videos.map(video2 => `**${++index} ->** \`${video2.title}\``).join('\n')}

===============================================

\`1 - 5\` arası bir rakam girin!
					`);
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 6, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						})
						
					} catch (err) {
						console.error(err);
						return msg.channel.sendMessage(`
						[Console]>>> Video Seçimi İptal Edildi!						
						`).then(msg => {
							msg.delete(3000)
						});
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('🆘 Bişey Bulamadım :(.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'geç') {
        if(!msg.member.roles.find("name","♪♪MÜZÜKÇÜ♪♪")) return msg.channel.sendMessage('Sadece Müzükçü Yapabilir!');
		if (!msg.member.voiceChannel) return msg.channel.send('Ses Kanalında Değilsin!');
		if (!serverQueue) return msg.channel.send('Senin için geçebileceğim şarkı yok.');
		serverQueue.connection.dispatcher.end('geç Komutu Kullanıldı!');
		return undefined;
	} else if (command === 'durdur') {
        if(!msg.member.roles.find("name","♪♪MÜZÜKÇÜ♪♪")) return msg.channel.sendMessage('Sadece Müzükçü Yapabilir!');
		if (!msg.member.voiceChannel) return msg.channel.send('Ses Kanalında Değilsin!');
		if (!serverQueue) return msg.channel.send('Hiç bişi çalmıyor!');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('durdur Komutu Kullanıldı!');
		return undefined;
    } else if (command === 'ses') {
        if(!msg.member.roles.find("name","♪♪MÜZÜKÇÜ♪♪")) return msg.channel.sendMessage('Sadece Müzükçü Yapabilir!');
		if (!msg.member.voiceChannel) return msg.channel.send('Ses Kanalında Değilsin!');
		if (!serverQueue) return msg.channel.send('Hiç Bişiy Çalmıyor!');
		if(isNaN(args[1])) {
			msg.channel.sendMessage('1-100 arası sayı giriniz!(`Ses Normal Seviyeye Getirildi!`)');
			serverQueue.volume = 5;
			serverQueue.connection.dispatcher.setVolumeLogarithmic(5 / 5);
			return;
		}
		if(args[1] > 100) {
			msg.channel.sendMessage('1-100 arası sayı giriniz!(`Ses Normal Seviyeye Getirildi!`)');
			serverQueue.volume = 5;
			serverQueue.connection.dispatcher.setVolumeLogarithmic(5 / 5);
			return;
		}
		if(args[1] < 1) {
			msg.channel.sendMessage('1-100 arası sayı giriniz!(`Ses Normal Seviyeye Getirildi!`)');
			serverQueue.volume = 5;
			serverQueue.connection.dispatcher.setVolumeLogarithmic(5 / 5);
			return;
		}
		if (!args[1]) return msg.channel.send(`Mevcut Ses: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`Ses Şu Düzeye Gelirirldi : **${args[1]}**`);
	} else if (command === 'çalanşarkı') {
        if(!msg.member.roles.find("name","♪♪MÜZÜKÇÜ♪♪")) return msg.channel.sendMessage('Sadece Müzükçü Yapabilir!');
		if (!serverQueue) return msg.channel.send('Hiç Bişiy Çalmıyor!');
		return msg.channel.send(`🎶 Şimdi Çalıyor!: \`${serverQueue.songs[0]}\``);
	} else if (command === 'sıra') {
        if (!serverQueue) return msg.channel.send('Hiç Bişiy Çalmıyor!');
		let index1 = 0;
		return msg.channel.send(`
__**Liste:**__
${serverQueue.songs.map(song => `**${++index1}** -> \`${song.title}\``).join('\n')}

========================================================

**✅ Şimdi Çalıyor => \`${serverQueue.songs[0].title}\`✅ **
		`);
	} else if (command === 'pause') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('⏸ Müziği Durdurdum!');
		}
		return msg.channel.send('Hiç Bişiy Çalmıyor!');
	} else if (command === 'resume') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('▶ Kaldığın Yerden Başlattım!');
		}
		return msg.channel.send('Hiç Bişiy Çalmıyor!');
	} else if(command === 'rsyt') {
		if(yapımcı !== msg.author.id){
			return msg.channel.sendMessage('Doğru Yetkiye Sahip Değilsin!');
		} else {
			msg.channel.sendMessage('Bot Yeniden Başlatılıyor...').then(msg => {
			console.log('Bot Yeniden Başlatılıyor...')
			process.exit(0);
			});
			
		}
	}

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`,
		sureh: video.duration.hours,
		surem: video.duration.minutes,
		sures: video.duration.seconds
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`I could not join the voice channel: ${error}`);
		}
	} else {
		const Discord = require('discord.js'); 
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else { 
			let res = `https://i.ytimg.com/vi/${song.id}/default.jpg?width=80&height=60`
			let e = new Discord.RichEmbed()
			.setTitle(`${song.title} Listeye Eklendi!`)
			.setColor('RANDOM')
			.setURL(song.url)
			.setThumbnail(res)
			.addField('Süre',`${song.sureh}:${song.surem}:${song.sures}`,true)
			return msg.channel.send(e);
		}
		}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`🎶 Şimdi Çalıyor => \`${song.title}\` (${song.sureh}:${song.surem}:${song.sures})`);
}



client.login(ayarlar.token);