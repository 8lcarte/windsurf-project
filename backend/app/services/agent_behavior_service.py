from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from decimal import Decimal
import numpy as np
from scipy import stats
from collections import defaultdict

from app.models.ai_agent import AIAgent
from app.models.agent_transaction import AgentTransaction, RiskLevel
from app.models.agent_function import FunctionUsageStats

logger = logging.getLogger(__name__)

class BehaviorPattern:
    def __init__(self, pattern_type: str, description: str, confidence: float, data: Dict[str, Any]):
        self.pattern_type = pattern_type
        self.description = description
        self.confidence = confidence
        self.data = data
        self.detected_at = datetime.utcnow()

class BehaviorProfile:
    def __init__(self, agent_id: int):
        self.agent_id = agent_id
        self.patterns: List[BehaviorPattern] = []
        self.risk_metrics: Dict[str, float] = {}
        self.last_updated = datetime.utcnow()
        
        # Behavioral metrics
        self.avg_transaction_amount: Optional[Decimal] = None
        self.std_transaction_amount: Optional[Decimal] = None
        self.typical_hours: List[int] = []
        self.frequent_merchants: Dict[str, int] = {}
        self.frequent_categories: Dict[str, int] = {}
        self.success_rate: Optional[float] = None

class AgentBehaviorService:
    def __init__(self):
        self.profiles: Dict[int, BehaviorProfile] = {}
        self.anomaly_thresholds = {
            "amount_zscore": 3.0,
            "frequency_multiplier": 2.0,
            "time_window_minutes": 60,
            "pattern_confidence": 0.8
        }

    async def analyze_behavior(
        self,
        db: AsyncSession,
        agent: AIAgent,
        lookback_days: int = 30
    ) -> BehaviorProfile:
        """Analyze agent behavior and generate/update behavior profile"""
        profile = self.profiles.get(agent.id) or BehaviorProfile(agent.id)
        
        # Get historical transactions
        transactions = await self._get_historical_transactions(db, agent.id, lookback_days)
        
        # Update behavioral metrics
        await self._update_behavioral_metrics(db, profile, transactions)
        
        # Detect patterns
        new_patterns = await self._detect_patterns(db, agent, transactions)
        profile.patterns.extend(new_patterns)
        
        # Calculate risk metrics
        profile.risk_metrics = await self._calculate_risk_metrics(db, agent, transactions)
        
        profile.last_updated = datetime.utcnow()
        self.profiles[agent.id] = profile
        
        return profile

    async def detect_anomalies(
        self,
        db: AsyncSession,
        agent: AIAgent,
        transaction: AgentTransaction
    ) -> List[Dict[str, Any]]:
        """Detect anomalies in current transaction based on behavioral profile"""
        profile = await self.analyze_behavior(db, agent)
        anomalies = []
        
        # Amount anomaly detection
        if profile.avg_transaction_amount and profile.std_transaction_amount:
            z_score = abs(float(transaction.amount - profile.avg_transaction_amount) / float(profile.std_transaction_amount))
            if z_score > self.anomaly_thresholds["amount_zscore"]:
                anomalies.append({
                    "type": "amount_anomaly",
                    "severity": min(z_score / self.anomaly_thresholds["amount_zscore"], 10),
                    "details": {
                        "z_score": z_score,
                        "amount": float(transaction.amount),
                        "avg_amount": float(profile.avg_transaction_amount)
                    }
                })

        # Time-based anomaly detection
        hour = transaction.created_at.hour
        if hour not in profile.typical_hours:
            anomalies.append({
                "type": "time_anomaly",
                "severity": 5.0,
                "details": {
                    "hour": hour,
                    "typical_hours": profile.typical_hours
                }
            })

        # Merchant anomaly detection
        if (transaction.merchant_name not in profile.frequent_merchants and 
            transaction.merchant_category not in profile.frequent_categories):
            anomalies.append({
                "type": "merchant_anomaly",
                "severity": 7.0,
                "details": {
                    "merchant": transaction.merchant_name,
                    "category": transaction.merchant_category
                }
            })

        return anomalies

    async def get_risk_assessment(
        self,
        db: AsyncSession,
        agent: AIAgent
    ) -> Dict[str, Any]:
        """Get comprehensive risk assessment based on behavioral analysis"""
        profile = await self.analyze_behavior(db, agent)
        
        # Calculate overall risk score
        risk_score = sum(
            score * weight
            for metric, score in profile.risk_metrics.items()
            for weight in [self._get_risk_weight(metric)]
        ) / sum(self._get_risk_weight(metric) for metric in profile.risk_metrics)

        return {
            "risk_score": risk_score,
            "risk_level": self._calculate_risk_level(risk_score),
            "risk_metrics": profile.risk_metrics,
            "behavioral_patterns": [
                {
                    "type": pattern.pattern_type,
                    "description": pattern.description,
                    "confidence": pattern.confidence,
                    "detected_at": pattern.detected_at
                }
                for pattern in profile.patterns[-5:]  # Last 5 patterns
            ],
            "anomalies": await self.detect_anomalies(
                db, agent, await self._get_last_transaction(db, agent.id)
            )
        }

    async def _get_historical_transactions(
        self,
        db: AsyncSession,
        agent_id: int,
        lookback_days: int
    ) -> List[AgentTransaction]:
        """Get historical transactions for analysis"""
        query = select(AgentTransaction).where(
            and_(
                AgentTransaction.agent_id == agent_id,
                AgentTransaction.created_at >= datetime.utcnow() - timedelta(days=lookback_days)
            )
        ).order_by(AgentTransaction.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()

    async def _update_behavioral_metrics(
        self,
        db: AsyncSession,
        profile: BehaviorProfile,
        transactions: List[AgentTransaction]
    ) -> None:
        """Update behavioral metrics in profile"""
        if not transactions:
            return

        # Calculate amount statistics
        amounts = [float(tx.amount) for tx in transactions]
        profile.avg_transaction_amount = Decimal(str(np.mean(amounts)))
        profile.std_transaction_amount = Decimal(str(np.std(amounts)))

        # Analyze typical transaction hours
        hours = [tx.created_at.hour for tx in transactions]
        hour_counts = defaultdict(int)
        for hour in hours:
            hour_counts[hour] += 1
        
        # Consider hours with frequency above mean as typical
        mean_freq = np.mean(list(hour_counts.values()))
        profile.typical_hours = [
            hour for hour, count in hour_counts.items()
            if count >= mean_freq
        ]

        # Analyze merchant patterns
        merchant_counts = defaultdict(int)
        category_counts = defaultdict(int)
        for tx in transactions:
            merchant_counts[tx.merchant_name] += 1
            category_counts[tx.merchant_category] += 1
        
        profile.frequent_merchants = dict(sorted(
            merchant_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10])  # Top 10 merchants
        
        profile.frequent_categories = dict(sorted(
            category_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5])  # Top 5 categories

    async def _detect_patterns(
        self,
        db: AsyncSession,
        agent: AIAgent,
        transactions: List[AgentTransaction]
    ) -> List[BehaviorPattern]:
        """Detect behavioral patterns in transactions"""
        patterns = []
        
        # Detect spending patterns
        spending_pattern = self._analyze_spending_pattern(transactions)
        if spending_pattern:
            patterns.append(spending_pattern)
        
        # Detect temporal patterns
        temporal_pattern = self._analyze_temporal_pattern(transactions)
        if temporal_pattern:
            patterns.append(temporal_pattern)
        
        # Detect merchant patterns
        merchant_pattern = self._analyze_merchant_pattern(transactions)
        if merchant_pattern:
            patterns.append(merchant_pattern)
        
        # Detect category patterns
        category_pattern = self._analyze_category_pattern(transactions)
        if category_pattern:
            patterns.append(category_pattern)

        return patterns

    async def _calculate_risk_metrics(
        self,
        db: AsyncSession,
        agent: AIAgent,
        transactions: List[AgentTransaction]
    ) -> Dict[str, float]:
        """Calculate risk metrics based on behavioral analysis"""
        metrics = {}
        
        if not transactions:
            return metrics

        # Transaction amount volatility
        amounts = [float(tx.amount) for tx in transactions]
        metrics["amount_volatility"] = float(np.std(amounts) / np.mean(amounts))

        # Merchant diversity
        unique_merchants = len(set(tx.merchant_name for tx in transactions))
        metrics["merchant_diversity"] = min(unique_merchants / len(transactions) * 10, 10.0)

        # Time pattern regularity
        hours = [tx.created_at.hour for tx in transactions]
        metrics["time_regularity"] = float(1.0 - stats.entropy(
            list(Counter(hours).values()), base=24
        ) / np.log(24))

        # Success rate trend
        success_rate = len([
            tx for tx in transactions 
            if tx.status == TransactionStatus.COMPLETED
        ]) / len(transactions)
        metrics["success_rate"] = float(success_rate * 10)

        return metrics

    def _analyze_spending_pattern(
        self,
        transactions: List[AgentTransaction]
    ) -> Optional[BehaviorPattern]:
        """Analyze spending patterns"""
        if not transactions:
            return None
            
        amounts = [float(tx.amount) for tx in transactions]
        
        # Check for consistent spending ranges
        q1, q3 = np.percentile(amounts, [25, 75])
        iqr = q3 - q1
        consistent_range = len([
            amt for amt in amounts 
            if q1 - 1.5 * iqr <= amt <= q3 + 1.5 * iqr
        ]) / len(amounts)
        
        if consistent_range > 0.8:
            return BehaviorPattern(
                pattern_type="spending_consistency",
                description=f"Consistent spending pattern between ${q1:.2f} and ${q3:.2f}",
                confidence=consistent_range,
                data={"q1": q1, "q3": q3, "iqr": iqr}
            )
        
        return None

    def _analyze_temporal_pattern(
        self,
        transactions: List[AgentTransaction]
    ) -> Optional[BehaviorPattern]:
        """Analyze temporal patterns"""
        if not transactions:
            return None
            
        hours = [tx.created_at.hour for tx in transactions]
        hour_counts = Counter(hours)
        
        # Check for preferred transaction hours
        total_tx = len(transactions)
        peak_hours = [
            hour for hour, count in hour_counts.items()
            if count >= total_tx * 0.2  # Hours with >20% of transactions
        ]
        
        if peak_hours:
            return BehaviorPattern(
                pattern_type="temporal_preference",
                description=f"Preferred transaction hours: {peak_hours}",
                confidence=sum(hour_counts[h] for h in peak_hours) / total_tx,
                data={"peak_hours": peak_hours}
            )
        
        return None

    def _analyze_merchant_pattern(
        self,
        transactions: List[AgentTransaction]
    ) -> Optional[BehaviorPattern]:
        """Analyze merchant patterns"""
        if not transactions:
            return None
            
        merchant_counts = Counter(tx.merchant_name for tx in transactions)
        total_tx = len(transactions)
        
        # Find preferred merchants
        preferred_merchants = [
            merchant for merchant, count in merchant_counts.items()
            if count >= total_tx * 0.15  # Merchants with >15% of transactions
        ]
        
        if preferred_merchants:
            return BehaviorPattern(
                pattern_type="merchant_preference",
                description=f"Preferred merchants: {', '.join(preferred_merchants)}",
                confidence=sum(merchant_counts[m] for m in preferred_merchants) / total_tx,
                data={"preferred_merchants": preferred_merchants}
            )
        
        return None

    def _analyze_category_pattern(
        self,
        transactions: List[AgentTransaction]
    ) -> Optional[BehaviorPattern]:
        """Analyze category patterns"""
        if not transactions:
            return None
            
        category_counts = Counter(tx.merchant_category for tx in transactions)
        total_tx = len(transactions)
        
        # Find dominant categories
        dominant_categories = [
            category for category, count in category_counts.items()
            if count >= total_tx * 0.25  # Categories with >25% of transactions
        ]
        
        if dominant_categories:
            return BehaviorPattern(
                pattern_type="category_preference",
                description=f"Dominant categories: {', '.join(dominant_categories)}",
                confidence=sum(category_counts[c] for c in dominant_categories) / total_tx,
                data={"dominant_categories": dominant_categories}
            )
        
        return None

    async def _get_last_transaction(
        self,
        db: AsyncSession,
        agent_id: int
    ) -> Optional[AgentTransaction]:
        """Get agent's last transaction"""
        query = select(AgentTransaction).where(
            AgentTransaction.agent_id == agent_id
        ).order_by(desc(AgentTransaction.created_at)).limit(1)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()

    def _get_risk_weight(self, metric: str) -> float:
        """Get risk weight for different metrics"""
        weights = {
            "amount_volatility": 0.3,
            "merchant_diversity": 0.2,
            "time_regularity": 0.2,
            "success_rate": 0.3
        }
        return weights.get(metric, 0.1)

    def _calculate_risk_level(self, risk_score: float) -> RiskLevel:
        """Calculate risk level based on risk score"""
        if risk_score < 3.0:
            return RiskLevel.LOW
        elif risk_score < 5.0:
            return RiskLevel.MEDIUM
        elif risk_score < 7.0:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

# Create singleton instance
behavior_analytics = AgentBehaviorService() 