const CryptoDataService = require('../../src/services/cryptoDataService');

describe('CryptoDataService', () => {
  let cryptoService;

  beforeEach(() => {
    cryptoService = new CryptoDataService();
  });

  describe('generateCryptoPrice', () => {
    it('should generate valid price data for supported symbol', () => {
      const priceData = cryptoService.generateCryptoPrice('BTC');
      
      expect(priceData).toHaveProperty('symbol', 'BTC');
      expect(priceData).toHaveProperty('price');
      expect(priceData).toHaveProperty('timestamp');
      expect(priceData).toHaveProperty('volume');
      expect(priceData).toHaveProperty('change24h');
      expect(priceData).toHaveProperty('trend');
      
      expect(typeof priceData.price).toBe('number');
      expect(priceData.price).toBeGreaterThan(0);
      expect(Date.parse(priceData.timestamp)).not.toBeNaN();
      expect(['up', 'down']).toContain(priceData.trend);
    });

    it('should throw error for unsupported symbol', () => {
      expect(() => cryptoService.generateCryptoPrice('INVALID')).toThrow();
    });
  });

  describe('generateAllPrices', () => {
    it('should generate prices for all supported symbols', () => {
      const prices = cryptoService.generateAllPrices();
      const supportedSymbols = cryptoService.getSupportedSymbols();
      
      expect(prices).toHaveLength(supportedSymbols.length);
      expect(prices.every(p => supportedSymbols.includes(p.symbol))).toBe(true);
    });
  });

  describe('validatePriceData', () => {
    it('should validate correct price data', () => {
      const validData = {
        symbol: 'BTC',
        price: 50000,
        timestamp: new Date().toISOString(),
      };
      
      expect(() => cryptoService.validatePriceData(validData)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidData = {
        symbol: 'BTC',
        price: 50000,
        // missing timestamp
      };
      
      expect(() => cryptoService.validatePriceData(invalidData)).toThrow();
    });

    it('should throw error for invalid price', () => {
      const invalidData = {
        symbol: 'BTC',
        price: -100,
        timestamp: new Date().toISOString(),
      };
      
      expect(() => cryptoService.validatePriceData(invalidData)).toThrow();
    });

    it('should throw error for invalid timestamp', () => {
      const invalidData = {
        symbol: 'BTC',
        price: 50000,
        timestamp: 'invalid-date',
      };
      
      expect(() => cryptoService.validatePriceData(invalidData)).toThrow();
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = cryptoService.getSupportedSymbols();
      
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
    });
  });

  describe('getMarketStats', () => {
    it('should return market statistics', () => {
      const stats = cryptoService.getMarketStats();
      
      expect(stats).toHaveProperty('totalSymbols');
      expect(stats).toHaveProperty('lastUpdate');
      expect(stats).toHaveProperty('symbols');
      
      expect(typeof stats.totalSymbols).toBe('number');
      expect(Array.isArray(stats.symbols)).toBe(true);
      expect(stats.symbols).toHaveLength(stats.totalSymbols);
    });
  });
});
