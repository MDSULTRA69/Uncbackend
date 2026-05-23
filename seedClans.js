// UNC Clan Seeder
// Run: node seedClans.js
// Place in unc-backend/ root and run once against your MongoDB

require('dotenv').config();
const mongoose = require('mongoose');
const { Clan } = require('./src/models/GameData');

const CLANS = [
  {
    name: 'Kazekage (Wind)',
    kkg: 'Wind Release Mastery',
    kkgDescription: 'Absolute control over wind chakra, capable of razor-sharp blades and devastating gusts.',
    autoCompatibleElements: ['Wind'],
    village: 'Sunagakure',
    description: 'The ruling bloodline of Sunagakure, masters of Wind Release.',
    specialAbilities: ['Wind Scythe', 'Vacuum Sphere', 'Wind Tunnel']
  },
  {
    name: 'Kazekage (Gold Dust)',
    kkg: 'Gold Dust Manipulation',
    kkgDescription: 'Manipulation of gold dust particles, used for powerful defensive barriers and crushing attacks.',
    autoCompatibleElements: ['Earth', 'Wind'],
    village: 'Sunagakure',
    description: 'A Kazekage bloodline wielding magnetized gold dust with devastating force.',
    specialAbilities: ['Gold Dust Wave', 'Gold Dust Prison', 'Golden Shield']
  },
  {
    name: 'Kazekage (Iron Dust)',
    kkg: 'Iron Dust Manipulation',
    kkgDescription: 'Control over iron dust particles, forging weapons and armor from raw magnetic force.',
    autoCompatibleElements: ['Earth', 'Lightning'],
    village: 'Sunagakure',
    description: 'A rare Kazekage variant with dominion over iron dust and magnetic fields.',
    specialAbilities: ['Iron Dust Armor', 'Magnetic Cage', 'Iron Spike Storm']
  },
  {
    name: 'Shirogane',
    kkg: 'Puppet Mastery',
    kkgDescription: 'Unparalleled puppet creation and control — can animate multiple puppets simultaneously.',
    autoCompatibleElements: [],
    village: 'Sunagakure',
    description: 'Legendary puppet masters of Sunagakure, creators of the finest war puppets.',
    specialAbilities: ['Tri-Puppet Formation', 'Iron Mother', 'Hidden Needle Barrage']
  },
  {
    name: 'Uchiha',
    kkg: 'Sharingan',
    kkgDescription: 'Doujutsu that grants perception of chakra flow, ability to copy jutsu, and access to Mangekyo abilities.',
    autoCompatibleElements: ['Fire'],
    village: 'Konohagakure',
    description: 'The legendary clan of the Sharingan, feared across all nations.',
    specialAbilities: ['Sharingan Copy', 'Amaterasu', 'Susanoo']
  },
  {
    name: 'Hyuga',
    kkg: 'Byakugan',
    kkgDescription: '360-degree vision and the ability to see and strike chakra points with Gentle Fist.',
    autoCompatibleElements: [],
    village: 'Konohagakure',
    description: 'Noble clan wielding the all-seeing Byakugan and the deadly Gentle Fist style.',
    specialAbilities: ['Eight Trigrams 64 Palms', 'Chakra Point Strike', 'Byakugan Vision']
  },
  {
    name: 'Nara',
    kkg: 'Shadow Manipulation',
    kkgDescription: 'Ability to extend and control shadows to bind and control opponents.',
    autoCompatibleElements: [],
    village: 'Konohagakure',
    description: 'Strategists of Konoha, masters of shadow-binding techniques.',
    specialAbilities: ['Shadow Possession', 'Shadow Stitching', 'Shadow Imitation']
  },
  {
    name: 'Aburame',
    kkg: 'Parasitic Insect Technique',
    kkgDescription: 'Body hosts a colony of chakra-feeding insects used for battle, tracking, and espionage.',
    autoCompatibleElements: [],
    village: 'Konohagakure',
    description: 'Silent clan bonded with kikaichū insects that feed on chakra.',
    specialAbilities: ['Insect Clone', 'Chakra Drain Swarm', 'Beetle Sphere']
  },
  {
    name: 'Yamanaka',
    kkg: 'Mind Body Techniques',
    kkgDescription: 'Ability to enter and control the minds of opponents, transmit thoughts, and share senses.',
    autoCompatibleElements: [],
    village: 'Konohagakure',
    description: 'Mind specialists who excel in communication, intelligence, and mental warfare.',
    specialAbilities: ['Mind Body Switch', 'Mind Transmission', 'Sensory Link']
  },
  {
    name: 'Yotsuki',
    kkg: 'Lightning Taijutsu',
    kkgDescription: 'Innate affinity to coat physical strikes with lightning chakra, boosting speed and lethality.',
    autoCompatibleElements: ['Lightning'],
    village: 'Kumogakure',
    description: 'Elite warriors of Kumogakure, their taijutsu crackles with raw lightning.',
    specialAbilities: ['Lightning Straight', 'Thunder Knee', 'Volt Rush']
  },
  {
    name: 'Chinoike',
    kkg: 'Ketsuryūgan',
    kkgDescription: 'Blood-red doujutsu granting genjutsu through eye contact and the ability to manipulate liquids — including blood.',
    autoCompatibleElements: ['Water'],
    village: 'Kirigakure',
    description: 'A cursed clan wielding the terrifying Ketsuryūgan, once exiled for their power.',
    specialAbilities: ['Blood Genjutsu', 'Liquid Manipulation', 'Ketsuryūgan Gaze']
  },
  {
    name: 'Hozuki',
    kkg: 'Hydrification Technique',
    kkgDescription: 'The body can fully liquify, passing through attacks and reforming at will.',
    autoCompatibleElements: ['Water'],
    village: 'Kirigakure',
    description: 'Clan with the ability to turn their body to water, near-impossible to hit physically.',
    specialAbilities: ['Water Body', 'Giant Water Mass', 'Liquid Escape']
  },
  {
    name: 'Karatachi',
    kkg: 'Jashin Curse Mark (Partial)',
    kkgDescription: 'Enhanced regeneration and pain resistance, with access to cursed ritual techniques.',
    autoCompatibleElements: [],
    village: 'Kirigakure',
    description: 'A resilient clan with fearsome endurance and cursed-energy arts.',
    specialAbilities: ['Pain Nullification', 'Curse Seal Strike', 'Undying Will']
  },
  {
    name: 'Hoshigaki',
    kkg: 'Shark Physiology',
    kkgDescription: 'Shark-like physical traits granting immense strength underwater and the ability to absorb chakra through skin contact.',
    autoCompatibleElements: ['Water'],
    village: 'Kirigakure',
    description: 'Fearsome shark-clan warriors, strongest in aquatic combat.',
    specialAbilities: ['Chakra Absorption Skin', 'Shark Skin Armor', 'Water Domain']
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const clanData of CLANS) {
      const exists = await Clan.findOne({ name: clanData.name });
      if (exists) {
        // Update existing clan with full data
        await Clan.findOneAndUpdate({ name: clanData.name }, clanData);
        console.log(`  Updated: ${clanData.name}`);
        skipped++;
      } else {
        await Clan.create(clanData);
        console.log(`  Created: ${clanData.name}`);
        created++;
      }
    }

    console.log(`\nDone! Created: ${created} | Updated: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err.message);
    process.exit(1);
  }
}

seed();
