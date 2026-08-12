/* ============================================================
   ELYAN — Belgian locality index (demo → replace with full NIS dataset)
   Production TODO: load official postcode/gemeente feed (Statbel / bpost).
   Structure is production-ready: name, postcode, province, nisCode optional.
   ============================================================ */
(function (global) {
  'use strict';

  var LOCATIONS = [
    { name: 'Antwerpen', postcode: '2000', province: 'Antwerpen' },
    { name: 'Berchem', postcode: '2600', province: 'Antwerpen' },
    { name: 'Borgerhout', postcode: '2140', province: 'Antwerpen' },
    { name: 'Deurne', postcode: '2100', province: 'Antwerpen' },
    { name: 'Wilrijk', postcode: '2610', province: 'Antwerpen' },
    { name: 'Merksem', postcode: '2170', province: 'Antwerpen' },
    { name: 'Hoboken', postcode: '2660', province: 'Antwerpen' },
    { name: 'Schoten', postcode: '2900', province: 'Antwerpen' },
    { name: 'Brasschaat', postcode: '2930', province: 'Antwerpen' },
    { name: 'Kapellen', postcode: '2950', province: 'Antwerpen' },
    { name: 'Mechelen', postcode: '2800', province: 'Antwerpen' },
    { name: 'Lier', postcode: '2500', province: 'Antwerpen' },
    { name: 'Turnhout', postcode: '2300', province: 'Antwerpen' },
    { name: 'Geel', postcode: '2440', province: 'Antwerpen' },
    { name: 'Herentals', postcode: '2200', province: 'Antwerpen' },
    { name: 'Mol', postcode: '2400', province: 'Antwerpen' },
    { name: 'Boom', postcode: '2850', province: 'Antwerpen' },
    { name: 'Kontich', postcode: '2550', province: 'Antwerpen' },
    { name: 'Edegem', postcode: '2650', province: 'Antwerpen' },
    { name: 'Mortsel', postcode: '2640', province: 'Antwerpen' },
    { name: 'Gent', postcode: '9000', province: 'Oost-Vlaanderen' },
    { name: 'Sint-Amandsberg', postcode: '9040', province: 'Oost-Vlaanderen' },
    { name: 'Ledeberg', postcode: '9050', province: 'Oost-Vlaanderen' },
    { name: 'Sint-Niklaas', postcode: '9100', province: 'Oost-Vlaanderen' },
    { name: 'Aalst', postcode: '9300', province: 'Oost-Vlaanderen' },
    { name: 'Dendermonde', postcode: '9200', province: 'Oost-Vlaanderen' },
    { name: 'Geraardsbergen', postcode: '9500', province: 'Oost-Vlaanderen' },
    { name: 'Lokeren', postcode: '9160', province: 'Oost-Vlaanderen' },
    { name: 'Eeklo', postcode: '9900', province: 'Oost-Vlaanderen' },
    { name: 'Oudenaarde', postcode: '9700', province: 'Oost-Vlaanderen' },
    { name: 'Deinze', postcode: '9800', province: 'Oost-Vlaanderen' },
    { name: 'Wetteren', postcode: '9230', province: 'Oost-Vlaanderen' },
    { name: 'Zele', postcode: '9240', province: 'Oost-Vlaanderen' },
    { name: 'Ninove', postcode: '9400', province: 'Oost-Vlaanderen' },
    { name: 'Ronse', postcode: '9600', province: 'Oost-Vlaanderen' },
    { name: 'Brugge', postcode: '8000', province: 'West-Vlaanderen' },
    { name: 'Assebroek', postcode: '8310', province: 'West-Vlaanderen' },
    { name: 'Kortrijk', postcode: '8500', province: 'West-Vlaanderen' },
    { name: 'Oostende', postcode: '8400', province: 'West-Vlaanderen' },
    { name: 'Roeselare', postcode: '8800', province: 'West-Vlaanderen' },
    { name: 'Ieper', postcode: '8900', province: 'West-Vlaanderen' },
    { name: 'Waregem', postcode: '8790', province: 'West-Vlaanderen' },
    { name: 'Knokke-Heist', postcode: '8300', province: 'West-Vlaanderen' },
    { name: 'Veurne', postcode: '8630', province: 'West-Vlaanderen' },
    { name: 'Tielt', postcode: '8700', province: 'West-Vlaanderen' },
    { name: 'Menen', postcode: '8930', province: 'West-Vlaanderen' },
    { name: 'Hasselt', postcode: '3500', province: 'Limburg' },
    { name: 'Genk', postcode: '3600', province: 'Limburg' },
    { name: 'Tongeren', postcode: '3700', province: 'Limburg' },
    { name: 'Sint-Truiden', postcode: '3800', province: 'Limburg' },
    { name: 'Maaseik', postcode: '3680', province: 'Limburg' },
    { name: 'Beringen', postcode: '3580', province: 'Limburg' },
    { name: 'Lommel', postcode: '3920', province: 'Limburg' },
    { name: 'Bilzen', postcode: '3740', province: 'Limburg' },
    { name: 'Leuven', postcode: '3000', province: 'Vlaams-Brabant' },
    { name: 'Heverlee', postcode: '3001', province: 'Vlaams-Brabant' },
    { name: 'Kessel-Lo', postcode: '3010', province: 'Vlaams-Brabant' },
    { name: 'Vilvoorde', postcode: '1800', province: 'Vlaams-Brabant' },
    { name: 'Tienen', postcode: '3300', province: 'Vlaams-Brabant' },
    { name: 'Aarschot', postcode: '3200', province: 'Vlaams-Brabant' },
    { name: 'Diest', postcode: '3290', province: 'Vlaams-Brabant' },
    { name: 'Halle', postcode: '1500', province: 'Vlaams-Brabant' },
    { name: 'Asse', postcode: '1730', province: 'Vlaams-Brabant' },
    { name: 'Zaventem', postcode: '1930', province: 'Vlaams-Brabant' },
    { name: 'Tervuren', postcode: '3080', province: 'Vlaams-Brabant' },
    { name: 'Wavre', postcode: '1300', province: 'Waals-Brabant' },
    { name: 'Ottignies-Louvain-la-Neuve', postcode: '1340', province: 'Waals-Brabant' },
    { name: 'Nivelles', postcode: '1400', province: 'Waals-Brabant' },
    { name: 'Braine-l\'Alleud', postcode: '1420', province: 'Waals-Brabant' },
    { name: 'Charleroi', postcode: '6000', province: 'Henegouwen' },
    { name: 'Mons', postcode: '7000', province: 'Henegouwen' },
    { name: 'Tournai', postcode: '7500', province: 'Henegouwen' },
    { name: 'La Louvière', postcode: '7100', province: 'Henegouwen' },
    { name: 'Mouscron', postcode: '7700', province: 'Henegouwen' },
    { name: 'Liège', postcode: '4000', province: 'Luik' },
    { name: 'Verviers', postcode: '4800', province: 'Luik' },
    { name: 'Seraing', postcode: '4100', province: 'Luik' },
    { name: 'Herstal', postcode: '4040', province: 'Luik' },
    { name: 'Namur', postcode: '5000', province: 'Namen' },
    { name: 'Dinant', postcode: '5500', province: 'Namen' },
    { name: 'Arlon', postcode: '6700', province: 'Luxemburg' },
    { name: 'Bastogne', postcode: '6600', province: 'Luxemburg' },
    { name: 'Marche-en-Famenne', postcode: '6900', province: 'Luxemburg' },
    { name: 'Brussel', postcode: '1000', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Schaerbeek', postcode: '1030', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Ixelles', postcode: '1050', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Anderlecht', postcode: '1070', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Uccle', postcode: '1180', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Molenbeek-Saint-Jean', postcode: '1080', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Etterbeek', postcode: '1040', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Woluwe-Saint-Lambert', postcode: '1200', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Woluwe-Saint-Pierre', postcode: '1150', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Forest', postcode: '1190', province: 'Brussels Hoofdstedelijk Gewest' },
    { name: 'Jette', postcode: '1090', province: 'Brussels Hoofdstedelijk Gewest' }
  ];

  function suggest(query, limit) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    limit = limit || 8;
    var starts = [];
    var posts = [];
    for (var i = 0; i < LOCATIONS.length; i++) {
      var l = LOCATIONS[i];
      var name = l.name.toLowerCase();
      if (l.postcode.indexOf(q) === 0) posts.push(l);
      else if (name.indexOf(q) === 0) starts.push(l);
    }
    return starts.concat(posts).slice(0, limit);
  }

  global.ElyanVakmannen = global.ElyanVakmannen || {};
  global.ElyanVakmannen.LOCATIONS = LOCATIONS;
  global.ElyanVakmannen.suggestLocations = suggest;
})(typeof window !== 'undefined' ? window : global);
