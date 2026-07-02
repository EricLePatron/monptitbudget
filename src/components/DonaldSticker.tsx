import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DonaldStickerProps {
  amount: number;
  expenseName?: string;
  onClose: () => void;
}

const getDonaldComment = (amount: number, name?: string): { emoji: string; comment: string } => {
  const expenseType = name?.toLowerCase() || '';
  
  // Specific comments based on expense name
  if (expenseType.includes('café') || expenseType.includes('coffee')) {
    const comments = [
      { emoji: '☕', comment: "Encore un café ?! Tu vas finir par avoir des plumes qui tremblent !" },
      { emoji: '🦆', comment: "Sacré nom d'un canard ! Un café à ce prix, autant boire l'eau du lac !" },
      { emoji: '😤', comment: "QUOI ?! C'est le prix d'un café maintenant ?! OUAK OUAK OUAK !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  if (expenseType.includes('resto') || expenseType.includes('restaurant') || expenseType.includes('repas')) {
    const comments = [
      { emoji: '🍽️', comment: "Un resto ? Moi je mange des vers et je m'en porte très bien !" },
      { emoji: '🦆', comment: "Pfff, Picsou aurait eu une attaque en voyant cette addition !" },
      { emoji: '😱', comment: "OUAK ! Pour ce prix, j'espère qu'ils t'ont servi du canard... euh, du poulet !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  if (expenseType.includes('transport') || expenseType.includes('essence') || expenseType.includes('metro')) {
    const comments = [
      { emoji: '🚗', comment: "Tu sais que moi je marche avec mes pattes palmées ? C'est GRATUIT !" },
      { emoji: '🦆', comment: "Sacrebleu ! Avec ce montant, j'aurais nagé jusqu'à la lune !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  if (expenseType.includes('shopping') || expenseType.includes('vêtement') || expenseType.includes('vetement')) {
    const comments = [
      { emoji: '👔', comment: "Encore des fringues ?! Moi mon costume de marin me suffit depuis 1934 !" },
      { emoji: '🦆', comment: "OUAK ! Tu sais que MOI je ne porte même pas de pantalon ?!" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  // Generic comments based on amount
  if (amount <= 5) {
    const comments = [
      { emoji: '🤷', comment: "Bon, ça va, c'est pas la ruine... pour cette fois !" },
      { emoji: '🦆', comment: "Pfff, même Picsou laisserait passer celle-là !" },
      { emoji: '😌', comment: "Ok ok, c'est raisonnable. Mais surveille-toi quand même !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  if (amount <= 15) {
    const comments = [
      { emoji: '🤔', comment: "Hmm, ça commence à chiffrer là... Tu es sûr que c'était nécessaire ?" },
      { emoji: '🦆', comment: "OUAK ! Mon oncle Picsou ferait une syncope en voyant ça !" },
      { emoji: '😅', comment: "Aïe aïe aïe ! C'est pas donné, dis donc !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  if (amount <= 30) {
    const comments = [
      { emoji: '😤', comment: "QUOI ?! Non mais tu te crois riche ou quoi ?!" },
      { emoji: '🦆', comment: "Sacré nom d'une plume ! C'est un hold-up !" },
      { emoji: '💸', comment: "OUAK OUAK OUAK ! Mon portefeuille pleure !" },
      { emoji: '😱', comment: "Nom d'un canard ! C'est presque mon loyer de la semaine !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  if (amount <= 50) {
    const comments = [
      { emoji: '🤯', comment: "CINQUANTE ?! Tu veux me faire faire une crise cardiaque ou quoi ?!" },
      { emoji: '🦆', comment: "OUAAAAK ! C'est une FORTUNE ! On n'est pas chez Picsou ici !" },
      { emoji: '😵', comment: "Mes plumes en tombent ! C'est de la FOLIE !" },
      { emoji: '💰', comment: "Tu jettes ton argent par les fenêtres ma parole !" },
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
  
  // Very high amounts
  const comments = [
    { emoji: '🤬', comment: "NON MAIS C'EST UNE BLAGUE ?! Tu as braqué une banque pour avoir autant ?!" },
    { emoji: '🦆', comment: "OUAK OUAK OUAK !!! Même Crésus n'aurait pas osé !" },
    { emoji: '😭', comment: "JE DÉMISSIONNE ! Tu es complètement FOU/FOLLE !" },
    { emoji: '💀', comment: "Mon cœur de canard ne supporte pas ces chiffres !" },
    { emoji: '🔥', comment: "Autant brûler tes billets directement, ça irait plus vite !" },
  ];
  return comments[Math.floor(Math.random() * comments.length)];
};

export function DonaldSticker({ amount, expenseName, onClose }: DonaldStickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { emoji, comment } = getDonaldComment(amount, expenseName);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto close after 4 seconds
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500);
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center pb-32">
      <div
        className={cn(
          "pointer-events-auto transition-all duration-500 ease-out",
          isVisible 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-8 scale-90"
        )}
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
      >
        {/* Speech Bubble */}
        <div className="speech-bubble max-w-[300px] cursor-pointer">
          <p className="text-foreground font-body font-medium text-sm leading-relaxed">
            {comment}
          </p>
        </div>

        {/* Donald Duck Emoji/Avatar */}
        <div className="flex items-center gap-2 mt-3 ml-4">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-3xl border border-border shadow-sm">
            {emoji}
          </div>
          <span className="font-display font-semibold text-foreground text-sm">
            Donald Duck
          </span>
        </div>
      </div>
    </div>
  );
}