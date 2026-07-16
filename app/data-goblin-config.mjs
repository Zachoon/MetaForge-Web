const SHARED_GATES={requirePublicSource:true,requireNamedAuthor:true,requirePublishedDate:true,paraphraseOnly:true,quarantineProfessionalOpinion:true,dedupeBySourceAndClaim:true,corroborationMinimum:2};

export const DATA_GOBLINS={
  mtg:{game:"mtg",...SHARED_GATES,sourceClasses:["official-rules","official-organized-play","tournament-coverage","player-interview","strategy-article","video-transcript"],lexicon:["archetype","sideboard","mulligan","mana","matchup"]},
  riftbound:{game:"riftbound",...SHARED_GATES,sourceClasses:["official-rules","official-organized-play","tournament-coverage","player-interview","strategy-article","video-transcript"],lexicon:["archetype","deck","matchup","sequencing","resource"]},
};

export function collectorEnvelope(game,claim){
  const config=DATA_GOBLINS[game];if(!config)throw new Error("Unsupported goblin game namespace");
  return {...claim,game:config.game,status:"quarantined",verification:{publicSource:config.requirePublicSource,namedAuthor:config.requireNamedAuthor,publishedDate:config.requirePublishedDate,corroborationMinimum:config.corroborationMinimum}};
}
