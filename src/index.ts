import { MongoClient, Db } from 'mongodb';
import * as express from 'express';
import formidable = require('express-formidable');
import * as path from 'path';

let url = 'mongodb://localhost:27017/emi';

let imageDir = 'c:\\data\\upload-img';
let emiDir = '../emi/dist'


export function run() {
	let app = express();
	let db: Db;

	app.use('/api', formidable({
		encoding: 'utf-8',
		uploadDir: imageDir,
		multiples: false,
		keepExtensions: true
	}));


	app.use('/', express.static(emiDir));
	app.use('/api/images/', express.static(imageDir));

	app.post('/api/card', (req, res) => {
		var files = req['files'];
		var fields = req['fields'];
		var card = JSON.parse(fields.data);
		card.printed = false;
		if (files.image) {
			card.image = path.basename(files.image.path);
		}
		db.collection('cards').insert(card);
		res.writeHead(200, { 'content-type': 'application/json'});
		res.end(JSON.stringify({
			message: 'Data Uploaded'
		}));

	});

	app.post('/api/print', (req, res) => {
		var print = req['fields'];
		if(print) {
			db.collection('print').insert(print);
			res.end(JSON.stringify({
				message: 'Print Recorded'
			}));
		} else {
			res.end(400);
		}
	});


	app.get('/api/stats', (req, res) => {
		return Promise.all([
			db.collection('cards').count({}),
			db.collection('print').count({})
		]).then((value) => {
			res.type('application/json');
			res.json({
				cardCount: value[0],
				printCount: value[1]
			});
		})
	});

	app.get('/api/card', (req, res) => {
		if (req.hostname !== "localhost") {
			res.send(401);
			return;
		}
		return db.collection('cards').find().toArray().then((value) => {
			res.type('application/json');
			res.json(value);
		});
	});

	app.get('/api/print', (req, res) => {
		if (req.hostname !== "localhost") {
			res.send(401);
			return;
		}
		return db.collection('print').find().toArray().then((value) => {
			res.type('application/json');
			res.json(value);
		});
	});

	MongoClient.connect(url, (error, database) => {
		if (error) {
			console.error(error);
			return;
		} else {
			console.log('Connected to database');
			db = database;

			app.listen(3000, () => {
				console.log('Server is running');
			})
		}
	});
}

