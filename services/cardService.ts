import { supabase } from '@/lib/supabase';

export interface Card {
  id: string;
  card_type: 'bronze' | 'silver' | 'black';
  card_number: string;
  cvv: string;
  expiration_date: string;
  wallet_address: string;
}

export const cardService = {
  async getUserCards(walletAddress: string): Promise<Card[]> {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user cards:', error);
      return [];
    }
  }
}; 