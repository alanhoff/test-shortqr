var app = require('express')();
var db = require('level')(__dirname + '/db');
var shortid = require('shortid');
var inquirer = require('inquirer');
var qr = require('qr-image');
var util = require('util');
var config = {};

// Funçao que pergunta a URL a ser encurtada
var encurtar = function() {
  inquirer.prompt([{
    type: 'input',
    name: 'url',
    message: 'Digite a URL a ser encurtada'
  }], function(resposta) {
    console.log('Encurtando %s', resposta);

    // Gera um ID curto para a URL
    var id = shortid.generate();

    db.put(id, resposta.url, function(err) {
      if (err)
        throw err;

      console.log('URL curta criada!');
      console.log('Acesse http://%s:%s/%s', config.host, config.port, id);
      console.log('ou http://%s:%s/qr/%s', config.host, config.port, id);

      // Reiniciar a pergunta
      encurtar();
    });
  });
};

// Listas de perguntas para configurar a aplicaç~ao
var perguntas = [{
  type: 'input',
  name: 'host',
  message: 'Qual o nome do dominio?',
  default: 'localhost'
}, {
  type: 'input',
  name: 'port',
  message: 'Porta da aplicaçao',
  default: 8080
}, {
  type: 'list',
  name: 'type',
  message: 'Em qual formato gerar o QRCode?',
  choices: ['png', 'svg', 'eps', 'pdf']
}];

// Pergunta ao usuario para configurar o servidor
inquirer.prompt(perguntas, function(respostas) {
  console.log('Iniciando servidor');
  config = respostas;

  app.listen(8080, function(err) {
    if (err)
      throw err;

    console.log('Servidor iniciado!');

    // Inicia o prompt para encurtar
    encurtar();
  });
});

// Temos duas rotas padroes, uma para redirecionar e outra para
// gerar o QRCode com a URL
app.get('/qr/:code', function(req, res) {
  var url = util.format('http://%s:%s/%s', config.host, config.port,
    req.params.code);

  // Seta as headers da resposta
  res.type(config.type);

  qr.image(url, {
    type: config.type
  }).pipe(res);

});

app.get('/:code', function(req, res) {
  db.get(req.params.code, function(err, url) {
    if(err && err.type === 'NotFoundError')
      return res.status(404).end();

    if (err)
      throw err;

    res.redirect(url);
  });
});
