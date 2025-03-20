from flask import Flask
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/test')
def test():
    return {'message': 'Test server is running!'}

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 9090))
    print(f"Starting test server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True) 