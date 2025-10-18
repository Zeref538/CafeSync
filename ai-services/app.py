from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from datetime import datetime, timedelta
import requests
import json

app = Flask(__name__)
CORS(app)

# Global variables for models
demand_model = None
recommendation_model = None
scaler = None

class CafeSyncAI:
    def __init__(self):
        self.demand_model = None
        self.recommendation_model = None
        self.scaler = StandardScaler()
        self.weather_api_key = os.getenv('WEATHER_API_KEY', 'demo-key')
        
    def load_models(self):
        """Load pre-trained models or create new ones"""
        try:
            # Try to load existing models
            self.demand_model = joblib.load('models/demand_model.pkl')
            self.recommendation_model = joblib.load('models/recommendation_model.pkl')
            self.scaler = joblib.load('models/scaler.pkl')
            print("Models loaded successfully")
        except FileNotFoundError:
            print("No existing models found, creating new ones...")
            self.create_models()
    
    def create_models(self):
        """Create and train new models with sample data"""
        # Generate sample data for training
        np.random.seed(42)
        n_samples = 1000
        
        # Sample features: weather, time, day_of_week, season
        weather_temp = np.random.normal(20, 10, n_samples)
        weather_condition = np.random.choice(['sunny', 'cloudy', 'rainy'], n_samples)
        hour = np.random.randint(6, 22, n_samples)
        day_of_week = np.random.randint(0, 7, n_samples)
        season = np.random.choice(['spring', 'summer', 'fall', 'winter'], n_samples)
        
        # Create feature matrix
        features = np.column_stack([
            weather_temp,
            [1 if c == 'sunny' else 0 for c in weather_condition],
            [1 if c == 'cloudy' else 0 for c in weather_condition],
            [1 if c == 'rainy' else 0 for c in weather_condition],
            hour,
            day_of_week,
            [1 if s == 'spring' else 0 for s in season],
            [1 if s == 'summer' else 0 for s in season],
            [1 if s == 'fall' else 0 for s in season],
            [1 if s == 'winter' else 0 for s in season],
        ])
        
        # Generate target variables
        # Demand influenced by weather and time
        base_demand = 50
        weather_effect = np.where(weather_condition == 'rainy', 1.2, 
                                 np.where(weather_condition == 'sunny', 1.1, 1.0))
        time_effect = np.where((hour >= 7) & (hour <= 9), 1.5,  # Morning rush
                              np.where((hour >= 12) & (hour <= 14), 1.3,  # Lunch
                                      np.where((hour >= 17) & (hour <= 19), 1.2, 1.0)))  # Evening
        
        demand = base_demand * weather_effect * time_effect + np.random.normal(0, 10, n_samples)
        demand = np.maximum(demand, 0)  # Ensure non-negative
        
        # Train demand prediction model
        self.demand_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.demand_model.fit(features, demand)
        
        # Create recommendation model (simplified)
        # In a real implementation, this would use collaborative filtering
        self.recommendation_model = RandomForestRegressor(n_estimators=50, random_state=42)
        
        # Create sample recommendation data
        user_features = np.random.rand(n_samples, 5)  # User preferences
        item_scores = np.random.rand(n_samples, 10)  # Item scores
        
        self.recommendation_model.fit(user_features, item_scores)
        
        # Fit scaler
        self.scaler.fit(features)
        
        # Save models
        os.makedirs('models', exist_ok=True)
        joblib.dump(self.demand_model, 'models/demand_model.pkl')
        joblib.dump(self.recommendation_model, 'models/recommendation_model.pkl')
        joblib.dump(self.scaler, 'models/scaler.pkl')
        
        print("Models created and saved successfully")
    
    def predict_demand(self, weather_data, time_data):
        """Predict demand based on weather and time"""
        if self.demand_model is None:
            return {"error": "Demand model not loaded"}
        
        # Prepare features
        features = np.array([[
            weather_data.get('temperature', 20),
            1 if weather_data.get('condition') == 'sunny' else 0,
            1 if weather_data.get('condition') == 'cloudy' else 0,
            1 if weather_data.get('condition') == 'rainy' else 0,
            time_data.get('hour', 12),
            time_data.get('day_of_week', 0),
            1 if time_data.get('season') == 'spring' else 0,
            1 if time_data.get('season') == 'summer' else 0,
            1 if time_data.get('season') == 'fall' else 0,
            1 if time_data.get('season') == 'winter' else 0,
        ]])
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Make prediction
        prediction = self.demand_model.predict(features_scaled)[0]
        
        return {
            "predicted_demand": max(0, int(prediction)),
            "confidence": 0.85,
            "factors": {
                "weather_impact": weather_data.get('condition', 'unknown'),
                "time_impact": time_data.get('hour', 12),
                "season_impact": time_data.get('season', 'unknown')
            }
        }
    
    def get_recommendations(self, user_id, order_history):
        """Get personalized drink recommendations"""
        if self.recommendation_model is None:
            return {"error": "Recommendation model not loaded"}
        
        # Analyze user preferences from order history
        preferences = self.analyze_user_preferences(order_history)
        
        # Generate recommendations
        recommendations = []
        
        # Popular items based on time and weather
        popular_items = [
            {"name": "Latte", "score": 0.9, "reason": "Popular choice"},
            {"name": "Cappuccino", "score": 0.8, "reason": "Perfect for this weather"},
            {"name": "Iced Coffee", "score": 0.7, "reason": "Great for warm weather"},
        ]
        
        # Filter based on user preferences
        filtered_recommendations = []
        for item in popular_items:
            if any(pref in item["name"].lower() for pref in preferences.get('preferred_types', [])):
                item["score"] += 0.2
            filtered_recommendations.append(item)
        
        # Sort by score
        filtered_recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "recommendations": filtered_recommendations[:5],
            "personalization_score": 0.8,
            "based_on": f"{len(order_history)} previous orders"
        }
    
    def analyze_user_preferences(self, order_history):
        """Analyze user preferences from order history"""
        if not order_history:
            return {"preferred_types": [], "favorite_time": "morning"}
        
        # Simple preference analysis
        drink_types = []
        for order in order_history:
            for item in order.get('items', []):
                if 'coffee' in item.get('name', '').lower():
                    drink_types.append('coffee')
                elif 'tea' in item.get('name', '').lower():
                    drink_types.append('tea')
                elif 'latte' in item.get('name', '').lower():
                    drink_types.append('latte')
        
        return {
            "preferred_types": list(set(drink_types)),
            "favorite_time": "morning"  # Simplified
        }
    
    def optimize_inventory(self, current_inventory, predicted_demand):
        """Optimize inventory based on predicted demand"""
        recommendations = []
        
        for item in current_inventory:
            current_stock = item.get('currentStock', 0)
            min_stock = item.get('minStock', 5)
            predicted_usage = predicted_demand * 0.1  # Simplified calculation
            
            if current_stock < min_stock:
                recommendations.append({
                    "item": item.get('name'),
                    "action": "reorder",
                    "quantity": min_stock * 2,
                    "priority": "high",
                    "reason": "Below minimum stock level"
                })
            elif current_stock < predicted_usage:
                recommendations.append({
                    "item": item.get('name'),
                    "action": "increase_stock",
                    "quantity": int(predicted_usage - current_stock),
                    "priority": "medium",
                    "reason": "May not meet predicted demand"
                })
        
        return {
            "recommendations": recommendations,
            "total_items_to_reorder": len([r for r in recommendations if r["action"] == "reorder"]),
            "estimated_cost": sum(r.get("quantity", 0) * 5 for r in recommendations)  # Simplified cost calculation
        }

# Initialize AI service
ai_service = CafeSyncAI()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "OK",
        "service": "CafeSync AI Services",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/predict/demand', methods=['POST'])
def predict_demand():
    try:
        data = request.get_json()
        weather_data = data.get('weather', {})
        time_data = data.get('time', {})
        
        # Load models if not already loaded
        if ai_service.demand_model is None:
            ai_service.load_models()
        
        prediction = ai_service.predict_demand(weather_data, time_data)
        return jsonify(prediction)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/recommendations/<user_id>', methods=['GET'])
def get_recommendations(user_id):
    try:
        # Get order history from request or use mock data
        order_history = request.args.get('order_history', '[]')
        order_history = json.loads(order_history) if order_history else []
        
        # Load models if not already loaded
        if ai_service.recommendation_model is None:
            ai_service.load_models()
        
        recommendations = ai_service.get_recommendations(user_id, order_history)
        return jsonify(recommendations)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/optimize/inventory', methods=['POST'])
def optimize_inventory():
    try:
        data = request.get_json()
        current_inventory = data.get('inventory', [])
        predicted_demand = data.get('predicted_demand', 50)
        
        optimization = ai_service.optimize_inventory(current_inventory, predicted_demand)
        return jsonify(optimization)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze/sales', methods=['POST'])
def analyze_sales():
    try:
        data = request.get_json()
        sales_data = data.get('sales', [])
        
        if not sales_data:
            return jsonify({"error": "No sales data provided"}), 400
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(sales_data)
        
        # Basic analytics
        total_sales = df['amount'].sum() if 'amount' in df.columns else 0
        total_orders = len(df)
        average_order_value = total_sales / total_orders if total_orders > 0 else 0
        
        # Time-based analysis
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            peak_hour = df.groupby('hour')['amount'].sum().idxmax()
        else:
            peak_hour = 12
        
        analysis = {
            "total_sales": float(total_sales),
            "total_orders": total_orders,
            "average_order_value": float(average_order_value),
            "peak_hour": int(peak_hour),
            "trends": {
                "growth_rate": 0.12,  # Simplified
                "seasonality": "moderate"
            }
        }
        
        return jsonify(analysis)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Load models on startup
    ai_service.load_models()
    
    port = int(os.getenv('AI_SERVICE_PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
