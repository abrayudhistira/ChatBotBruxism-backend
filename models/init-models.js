var DataTypes = require("sequelize").DataTypes;
var _admins = require("./admins");
var _patients = require("./patients");
var _questions = require("./questions");
var _symptomlogs = require("./symptomlogs");

function initModels(sequelize) {
  var admins = _admins(sequelize, DataTypes);
  var patients = _patients(sequelize, DataTypes);
  var questions = _questions(sequelize, DataTypes);
  var symptomlogs = _symptomlogs(sequelize, DataTypes);

  symptomlogs.belongsTo(patients, { as: "phone_number_patient", foreignKey: "phone_number"});
  patients.hasMany(symptomlogs, { as: "symptomlogs", foreignKey: "phone_number"});
  symptomlogs.belongsTo(questions, { as: "question", foreignKey: "question_id"});
  questions.hasMany(symptomlogs, { as: "symptomlogs", foreignKey: "question_id"});

  return {
    admins,
    patients,
    questions,
    symptomlogs,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
