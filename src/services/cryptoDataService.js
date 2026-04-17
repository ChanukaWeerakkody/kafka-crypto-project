const logger = require('../utils/logger');

class CryptoDataService {
  constructor() {
    this.priceGenerators = new Map();
    this.initializeGenerators();
  }

  initializeGenerators() {
    const cryptoPairs = [
      { symbol: 'BTC', basePrice: 60000, volatility: 2000 },
      { symbol: 'ETH', basePrice: 3500, volatility: 150 },
      { symbol: 'BNB', basePrice: 400, volatility: 20 },
      { symbol: 'ADA', basePrice: 0.6, volatility: 0.05 },
      { symbol: 'SOL', basePrice: 150, volatility: 10 },
    ];

    cryptoPairs.forEach(pair => {
      this.priceGenerators.set(pair.symbol, {
        ...pair,
        lastPrice: pair.basePrice,
        trend: Math.random() > 0.5 ? 1 : -1,
      });
    });

    logger.info(`Initialized ${cryptoPairs.length} crypto price generators`);
  }

  generateCryptoPrice(symbol) {
    const generator = this.priceGenerators.get(symbol);
    if (!generator) {
      throw new Error(`No price generator found for symbol: ${symbol}`);
    }

    // Simulate market dynamics
    const trendChange = Math.random();
    if (trendChange < 0.1) { // 10% chance to change trend
      generator.trend *= -1;
    }

    const volatilityFactor = (Math.random() - 0.5) * 2; // -1 to 1
    const priceChange = (volatilityFactor * generator.volatility * generator.trend) / 100;
    
    generator.lastPrice = Math.max(
      generator.basePrice * 0.5, // Minimum 50% of base price
      Math.min(
        generator.basePrice * 2, // Maximum 200% of base price
        generator.lastPrice + priceChange
      )
    );

    return {
      symbol,
      price: parseFloat(generator.lastPrice.toFixed(2)),
      timestamp: new Date().toISOString(),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      change24h: parseFloat(((generator.lastPrice - generator.basePrice) / generator.basePrice * 100).toFixed(2)),
      trend: generator.trend > 0 ? 'up' : 'down',
    };
  }

  generateAllPrices() {
    const prices = [];
    for (const symbol of this.priceGenerators.keys()) {
      try {
        prices.push(this.generateCryptoPrice(symbol));
      } catch (error) {
        logger.error(`Error generating price for ${symbol}:`, error);
      }
    }
    return prices;
  }

  validatePriceData(data) {
    const requiredFields = ['symbol', 'price', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (typeof data.price !== 'number' || data.price <= 0) {
      throw new Error('Price must be a positive number');
    }

    if (!Date.parse(data.timestamp)) {
      throw new Error('Invalid timestamp format');
    }

    return true;
  }

  getSupportedSymbols() {
    return Array.from(this.priceGenerators.keys());
  }

  getMarketStats() {
    const stats = {
      totalSymbols: this.priceGenerators.size,
      lastUpdate: new Date().toISOString(),
      symbols: [],
    };

    for (const [symbol, generator] of this.priceGenerators.entries()) {
      stats.symbols.push({
        symbol,
        currentPrice: generator.lastPrice,
        basePrice: generator.basePrice,
        trend: generator.trend > 0 ? 'up' : 'down',
        change24h: parseFloat(((generator.lastPrice - generator.basePrice) / generator.basePrice * 100).toFixed(2)),
      });
    }

    return stats;
  }
}

module.exports = CryptoDataService;
