import { MongoClient, Db, ObjectID } from 'mongodb';
import * as events from 'events';
import * as express from 'express';
import formidable = require('express-formidable');
import * as path from 'path';
import * as serveStatic from 'serve-static';

let url = 'mongodb://localhost:27017/emi';

let imageDir = 'c:\\data\\upload-img';
let emiDir = '../emi/dist' 

events.EventEmitter.prototype['maxListeners'] = 0;


process.setMaxListeners(0);


export function run() {
	let app = express();
	let db: Db;

	app.use('/api', formidable({
		encoding: 'utf-8',
		uploadDir: imageDir,
		multiples: false,
		keepExtensions: true
	}));


	app.use('/images/', serveStatic(imageDir));

	app.post('/api/card', (req, res) => {
		var files = req['files'];
		var fields = req['fields'];
		var card = JSON.parse(fields.data);
		card.printed = false;
		if (files.image) {
			card.image = path.basename(files.image.path);
		}
		db.collection('cards').insert(card);
		res.sendStatus(201);
	});

	app.put('/api/card', (req, res) => {
		if (req.hostname !== "localhost") {
			res.sendStatus(401);
			return;
		}

		var fields = req['fields'];
		var updates = JSON.parse(fields.update) as any[];

		for(let update of updates) {
			db.collection('cards').update({ _id: new ObjectID(update.id)}, update.data);
		}
		res.sendStatus(202);
	});

	app.post('/api/print', (req, res) => {
		var print = req['fields'];
		if(print) {
			db.collection('print').insert(print);
			res.sendStatus(201);
		} else {
			res.sendStatus(400);
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
			res.sendStatus(401);
			return;
		}

		let filter = {};
		if (req.query.filter) {
			filter = JSON.parse(req.query.filter);
		}

		return db.collection('cards').find(filter).toArray().then((value) => {
			res.type('application/json');
			res.json(value);
		});
	});

	app.get('/api/print', (req, res) => {
		if (req.hostname !== "localhost") {
			res.sendStatus(401);
			return;
		}
		return db.collection('print').find().toArray().then((value) => {
			res.type('application/json');
			res.json(value);
		});
	});

	app.use('/', serveStatic(emiDir));

	MongoClient.connect(url, (error, database) => {
		if (error) {
			console.error(error);
			return;
		} else {
			console.log('Connected to database');
			db = database;

			app.listen(80, () => {
				console.log('Server is running');
			})
		}
	});
}

