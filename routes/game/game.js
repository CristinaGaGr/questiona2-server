const express = require('express');
const router = express.Router();
const User = require('../../models/user');
const Game = require('../../models/game')
const Actualgames = require("../../models/actual")
const Questions = require('../../models/questions')

const pinGenerator = async () => {
    let pin = Math.floor(Math.random() * 9000) + 1000
    let game_id = null
    if (await Actualgames.find({ pin }) == "") {
        let game = await Game.create({})
        game_id = game._id

        await Actualgames.create({ pin, game_id })

    } else {
        return pinGenerator()
    }
    return { pin, game_id }
}


const questionGenerator = async (numberOfQuestions, dificulty, categories) => {
    let arrayQuestions = []
    let selectedQuestions = []
    arrayQuestions = await Questions.find({ category: categories, difficulty: dificulty }, { _id: 1 })
    let numberResponseMongo = arrayQuestions.length
    for (let i = 0; i < numberOfQuestions - 1 && i < numberResponseMongo; i++) {
        let position = Math.floor(Math.random() * arrayQuestions.length)
        selectedQuestions.push(arrayQuestions[position])
        arrayQuestions.splice(position, 1)
    }
    return (selectedQuestions)
};



router.post('/', async (req, res) => {

    let { username, difficulty, categories, numberOfQuestions } = req.body;
    const arrayQuestions = await questionGenerator(numberOfQuestions, difficulty, categories);
    const { pin, game_id } = await pinGenerator();
    if (req.userId === null) {
        await Game.findByIdAndUpdate(game_id, { questions: arrayQuestions, nologgedOwner: username })
    } else {
        await User.findById(req.userId, (err, resp) => { username = resp.username });
        await Game.findByIdAndUpdate(game_id, { questions: arrayQuestions, owner: username })
    }
    setTimeout(() => {
        Actualgames.findOneAndDelete({ game_id }, (err, res) => {
        })
        console.log("cleaning unstarted game..", game_id)
    }, 30 * 60 * 1000);
    res.send({ pin, game_id })
});





router.post('/join', async (req, res) => {

    let actualGame = await Actualgames.findOne({ pin: +req.body.pin });
    if (actualGame.game_id.id === "") {
        res.status(404).send("pincode not valid or game started")
    } else {

        if (req.userId) {
            Game.findByIdAndUpdate(actualGame.game_id, { $push: { users: req.userId } })
        } else {
            Game.findByIdAndUpdate(actualGame.game_id, {
                $push: {
                    noLogedUsers: req.body.username
                }
            })
        }
        res.status(200).send(actualGame.game_id);
    }
});


router.get('/check', (req, res) => {
    let { username, pin } = req.query
    try {

        Actualgames.findOne({ pin }).populate('game_id').exec((err, actualGame) => {
            if (err) {
                res.status(400).send("Invalid Pin")
                console.log(err)
            }
            if (actualGame.game_id.users.findIndex(user => user.username === username) === -1) {
                res.status(200).send()
            } else {
                res.status(400).send("Username in use")
            }
        })

    } catch (error) {
        console.log(error)
        
    }
})

module.exports = router;
