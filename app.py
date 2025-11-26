from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Configuração básica
app = Flask(__name__)
CORS(app, supports_credentials=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Modelos
class Aluno(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(50), unique=True, nullable=False)
    senha = db.Column(db.String(50), nullable=False)
    escola = db.Column(db.String(100), nullable=False)
    pontos = db.Column(db.Integer, default=0)
    nome = db.Column(db.String(100), default="Aluno")
    idade = db.Column(db.Integer, default=0)
    nivel_ensino = db.Column(db.String(50), default="")

class RegistroPonto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    aluno_id = db.Column(db.Integer, db.ForeignKey('aluno.id'))
    inicio = db.Column(db.DateTime, nullable=False)
    fim = db.Column(db.DateTime)
    pontos_ganhos = db.Column(db.Integer, default=0)
    aluno = db.relationship('Aluno', backref=db.backref('registros', lazy=True))

class Premio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(200))
    pontos_necessarios = db.Column(db.Integer, nullable=False)
    ativo = db.Column(db.Boolean, default=True)
    validade = db.Column(db.String(50))
    lojas_parceiras = db.Column(db.String(200))

class ResgatePremio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    aluno_id = db.Column(db.Integer, db.ForeignKey('aluno.id'))
    premio_id = db.Column(db.Integer, db.ForeignKey('premio.id'))
    data_resgate = db.Column(db.DateTime, nullable=False, default=datetime.now)
    pontos_gastos = db.Column(db.Integer, nullable=False)
    aluno = db.relationship('Aluno', backref=db.backref('resgates', lazy=True))
    premio = db.relationship('Premio', backref=db.backref('resgates', lazy=True))


# Rotas de páginas
@app.route('/')
def home():
    return send_from_directory('static', 'index.html')

@app.route('/ponto')
def ponto():
    return send_from_directory('static', 'ponto.html')

@app.route('/perfil')
def perfil():
    return send_from_directory('static', 'perfil.html')

@app.route('/historico')
def historico():
    return send_from_directory('static', 'historico.html')

@app.route('/premios')
def premios():
    return send_from_directory('static', 'premios.html')


# Rotas de API

# Login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    matricula = data.get('matricula')
    senha = data.get('senha')
    escola = data.get('escola')

    aluno = Aluno.query.filter_by(matricula=matricula, senha=senha, escola=escola).first()

    if aluno:
        return jsonify({
            "success": True,
            "message": "Login bem-sucedido!",
            "aluno": {
                "matricula": aluno.matricula,
                "escola": aluno.escola,
                "pontos": aluno.pontos
            }
        })
    else:
        return jsonify({"success": False, "message": "Credenciais inválidas!"}), 401


# Iniciar ponto
@app.route('/iniciar_ponto', methods=['POST'])
def iniciar_ponto():
    data = request.json
    matricula = data.get('matricula')

    aluno = Aluno.query.filter_by(matricula=matricula).first()
    if not aluno:
        return jsonify({'error': 'Aluno não encontrado'}), 404

    registro = RegistroPonto(aluno_id=aluno.id, inicio=datetime.now())
    db.session.add(registro)
    db.session.commit()

    return jsonify({'message': 'Ponto iniciado com sucesso', 'registro_id': registro.id})


# Finalizar ponto
@app.route('/finalizar_ponto', methods=['POST'])
def finalizar_ponto():
    data = request.get_json()
    registro_id = data.get('registro_id')

    registro = RegistroPonto.query.get(registro_id)
    if not registro:
        return jsonify({'erro': 'Registro não encontrado'}), 404

    if registro.fim is not None:
        return jsonify({'erro': 'Este ponto já foi finalizado'}), 400

    registro.fim = datetime.now()

    duracao = (registro.fim - registro.inicio).total_seconds()
    pontos_ganhos = int(duracao // 60)
    if pontos_ganhos < 1:
        pontos_ganhos = 1

    registro.pontos_ganhos = pontos_ganhos

    aluno = Aluno.query.get(registro.aluno_id)
    aluno.pontos += pontos_ganhos

    db.session.commit()

    return jsonify({
        'mensagem': 'Ponto finalizado com sucesso!',
        'pontos_ganhos': pontos_ganhos
    })


# Obter pontos
@app.route('/get_pontos', methods=['POST'])
def get_pontos():
    data = request.get_json()
    matricula = data.get('matricula')

    aluno = Aluno.query.filter_by(matricula=matricula).first()
    if not aluno:
        return jsonify({'erro': 'Aluno não encontrado'}), 404

    return jsonify({'pontos': aluno.pontos})


# Histórico de pontos
@app.route('/historico_pontos', methods=['POST'])
def historico_pontos():
    data = request.get_json()
    matricula = data.get('matricula')

    aluno = Aluno.query.filter_by(matricula=matricula).first()
    if not aluno:
        return jsonify({'erro': 'Aluno não encontrado'}), 404

    registros = RegistroPonto.query.filter_by(aluno_id=aluno.id).order_by(RegistroPonto.inicio.desc()).all()

    historico = []
    for r in registros:
        if r.fim:  # Só inclui registros finalizados
            duracao = (r.fim - r.inicio).total_seconds()
            horas = int(duracao // 3600)
            minutos = int((duracao % 3600) // 60)
            segundos = int(duracao % 60)
            
            historico.append({
                'escola': aluno.escola,
                'data': r.fim.strftime('%d/%m'),
                'hora': r.fim.strftime('%H:%M:%S'),
                'pontos_ganhos': r.pontos_ganhos,
                'duracao': f"{horas:02d}:{minutos:02d}:{segundos:02d}"
            })

    return jsonify({'historico': historico})


# Perfil do aluno
@app.route('/api/perfil', methods=['POST'])
def api_perfil():
    data = request.get_json()
    matricula = data.get('matricula')

    aluno = Aluno.query.filter_by(matricula=matricula).first()
    if not aluno:
        return jsonify({'erro': 'Aluno não encontrado'}), 404

    registros = RegistroPonto.query.filter_by(aluno_id=aluno.id).all()
    alunos_escola = Aluno.query.filter_by(escola=aluno.escola).order_by(Aluno.pontos.desc()).all()
    posicao_ranking = next((i + 1 for i, a in enumerate(alunos_escola) if a.id == aluno.id), None)
    registros_dados = [
        {
            'inicio': r.inicio.isoformat(),
            'fim': r.fim.isoformat() if r.fim else None,
            'pontos_ganhos': r.pontos_ganhos
        }
        for r in registros
    ]

    return jsonify({
        'nome': aluno.nome,
        'idade': aluno.idade,
        'nivel_ensino': aluno.nivel_ensino,
        'escola': aluno.escola,
        'matricula': aluno.matricula,
        'pontos': aluno.pontos,
        'registros': registros_dados,
        'posicao_ranking': posicao_ranking
    })


# Listar prêmios
@app.route('/api/premios', methods=['GET'])
def listar_premios():
    premios = Premio.query.filter_by(ativo=True).order_by(Premio.pontos_necessarios.asc()).all()
    
    premios_lista = [
        {
            'id': p.id,
            'nome': p.nome,
            'descricao': p.descricao,
            'pontos_necessarios': p.pontos_necessarios,
            'validade': p.validade,
            'lojas_parceiras': p.lojas_parceiras
        }
        for p in premios
    ]
    
    return jsonify({'premios': premios_lista})


# Resgatar prêmio
@app.route('/api/resgatar_premio', methods=['POST'])
def resgatar_premio():
    data = request.get_json()
    matricula = data.get('matricula')
    premio_id = data.get('premio_id')
    
    aluno = Aluno.query.filter_by(matricula=matricula).first()
    if not aluno:
        return jsonify({'erro': 'Aluno não encontrado'}), 404
    
    premio = Premio.query.get(premio_id)
    if not premio:
        return jsonify({'erro': 'Prêmio não encontrado'}), 404
    
    if not premio.ativo:
        return jsonify({'erro': 'Prêmio não está mais disponível'}), 400
    
    if aluno.pontos < premio.pontos_necessarios:
        return jsonify({'erro': 'Pontos insuficientes'}), 400
    
    aluno.pontos -= premio.pontos_necessarios
    resgate = ResgatePremio(
        aluno_id=aluno.id,
        premio_id=premio.id,
        pontos_gastos=premio.pontos_necessarios
    )
    db.session.add(resgate)
    db.session.commit()
    
    return jsonify({
        'mensagem': 'Prêmio resgatado com sucesso!',
        'pontos_restantes': aluno.pontos
    })


# Execução
if __name__ == '__main__':
    with app.app_context():
        db.create_all()

        if not Aluno.query.filter_by(matricula='12345').first():
            aluno = Aluno(
                matricula='12345', 
                senha='senha123', 
                escola='Escola Central',
                nome='João da Silva',
                idade=17,
                nivel_ensino='3° M'
            )
            db.session.add(aluno)
            db.session.commit()
        
        if Premio.query.count() == 0:
            premios_exemplo = [
                Premio(
                    nome='Vale presente R$10',
                    descricao='Válido em 5 lojas parceiras.',
                    pontos_necessarios=1500,
                    validade=None,
                    lojas_parceiras='5 lojas parceiras'
                ),
                Premio(
                    nome='Cinema grátis!',
                    descricao='Válido até 10/10 em cinemas parceiros.',
                    pontos_necessarios=2300,
                    validade='Válido até 10/10',
                    lojas_parceiras='Cinemas parceiros'
                ),
                Premio(
                    nome='Desconto 20% em livros',
                    descricao='Válido em livrarias parceiras.',
                    pontos_necessarios=1000,
                    validade=None,
                    lojas_parceiras='Livrarias parceiras'
                )
            ]
            for premio in premios_exemplo:
                db.session.add(premio)
            db.session.commit()

    app.run(debug=True)