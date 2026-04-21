const EXERCISES = [
  // ── CHEST ──
  {id:'e001',name:'Barbell Bench Press',cat:'Chest',eq:'Barbell',muscles:['Chest','Triceps','Front Delts'],emoji:'🏋️'},
  {id:'e002',name:'Incline Barbell Bench Press',cat:'Chest',eq:'Barbell',muscles:['Upper Chest','Triceps'],emoji:'🏋️'},
  {id:'e003',name:'Decline Barbell Bench Press',cat:'Chest',eq:'Barbell',muscles:['Lower Chest','Triceps'],emoji:'🏋️'},
  {id:'e004',name:'Dumbbell Bench Press',cat:'Chest',eq:'Dumbbell',muscles:['Chest','Triceps'],emoji:'🥊'},
  {id:'e005',name:'Incline Dumbbell Press',cat:'Chest',eq:'Dumbbell',muscles:['Upper Chest','Triceps'],emoji:'🥊'},
  {id:'e006',name:'Dumbbell Fly',cat:'Chest',eq:'Dumbbell',muscles:['Chest'],emoji:'🥊'},
  {id:'e007',name:'Cable Fly',cat:'Chest',eq:'Cable',muscles:['Chest'],emoji:'⚡'},
  {id:'e008',name:'Push-Up',cat:'Chest',eq:'Bodyweight',muscles:['Chest','Triceps','Front Delts'],emoji:'💪'},
  {id:'e009',name:'Chest Dips',cat:'Chest',eq:'Bodyweight',muscles:['Lower Chest','Triceps'],emoji:'💪'},
  {id:'e010',name:'Machine Chest Press',cat:'Chest',eq:'Machine',muscles:['Chest','Triceps'],emoji:'🔩'},
  {id:'e011',name:'Pec Deck',cat:'Chest',eq:'Machine',muscles:['Chest'],emoji:'🔩'},

  // ── BACK ──
  {id:'e012',name:'Deadlift',cat:'Back',eq:'Barbell',muscles:['Lower Back','Hamstrings','Glutes','Traps'],emoji:'🏋️'},
  {id:'e013',name:'Barbell Row',cat:'Back',eq:'Barbell',muscles:['Lats','Rhomboids','Biceps'],emoji:'🏋️'},
  {id:'e014',name:'T-Bar Row',cat:'Back',eq:'Barbell',muscles:['Mid Back','Lats'],emoji:'🏋️'},
  {id:'e015',name:'Pull-Up',cat:'Back',eq:'Bodyweight',muscles:['Lats','Biceps'],emoji:'💪'},
  {id:'e016',name:'Chin-Up',cat:'Back',eq:'Bodyweight',muscles:['Lats','Biceps'],emoji:'💪'},
  {id:'e017',name:'Lat Pulldown',cat:'Back',eq:'Cable',muscles:['Lats','Biceps'],emoji:'⚡'},
  {id:'e018',name:'Seated Cable Row',cat:'Back',eq:'Cable',muscles:['Mid Back','Lats','Biceps'],emoji:'⚡'},
  {id:'e019',name:'Dumbbell Row',cat:'Back',eq:'Dumbbell',muscles:['Lats','Rhomboids'],emoji:'🥊'},
  {id:'e020',name:'Face Pull',cat:'Back',eq:'Cable',muscles:['Rear Delts','Rotator Cuff'],emoji:'⚡'},
  {id:'e021',name:'Romanian Deadlift',cat:'Back',eq:'Barbell',muscles:['Hamstrings','Lower Back','Glutes'],emoji:'🏋️'},
  {id:'e022',name:'Hyperextension',cat:'Back',eq:'Machine',muscles:['Lower Back','Glutes'],emoji:'🔩'},
  {id:'e023',name:'Good Morning',cat:'Back',eq:'Barbell',muscles:['Lower Back','Hamstrings'],emoji:'🏋️'},

  // ── SHOULDERS ──
  {id:'e024',name:'Overhead Press',cat:'Shoulders',eq:'Barbell',muscles:['Front Delts','Side Delts','Triceps'],emoji:'🏋️'},
  {id:'e025',name:'Dumbbell Shoulder Press',cat:'Shoulders',eq:'Dumbbell',muscles:['Front Delts','Side Delts'],emoji:'🥊'},
  {id:'e026',name:'Arnold Press',cat:'Shoulders',eq:'Dumbbell',muscles:['All Delts'],emoji:'🥊'},
  {id:'e027',name:'Lateral Raise',cat:'Shoulders',eq:'Dumbbell',muscles:['Side Delts'],emoji:'🥊'},
  {id:'e028',name:'Front Raise',cat:'Shoulders',eq:'Dumbbell',muscles:['Front Delts'],emoji:'🥊'},
  {id:'e029',name:'Rear Delt Fly',cat:'Shoulders',eq:'Dumbbell',muscles:['Rear Delts'],emoji:'🥊'},
  {id:'e030',name:'Cable Lateral Raise',cat:'Shoulders',eq:'Cable',muscles:['Side Delts'],emoji:'⚡'},
  {id:'e031',name:'Upright Row',cat:'Shoulders',eq:'Barbell',muscles:['Side Delts','Traps'],emoji:'🏋️'},
  {id:'e032',name:'Machine Shoulder Press',cat:'Shoulders',eq:'Machine',muscles:['Delts','Triceps'],emoji:'🔩'},
  {id:'e033',name:'Barbell Shrugs',cat:'Shoulders',eq:'Barbell',muscles:['Traps'],emoji:'🏋️'},

  // ── BICEPS ──
  {id:'e034',name:'Barbell Curl',cat:'Arms',eq:'Barbell',muscles:['Biceps'],emoji:'💪'},
  {id:'e035',name:'EZ-Bar Curl',cat:'Arms',eq:'Barbell',muscles:['Biceps','Brachialis'],emoji:'💪'},
  {id:'e036',name:'Dumbbell Curl',cat:'Arms',eq:'Dumbbell',muscles:['Biceps'],emoji:'🥊'},
  {id:'e037',name:'Hammer Curl',cat:'Arms',eq:'Dumbbell',muscles:['Brachialis','Brachioradialis'],emoji:'🥊'},
  {id:'e038',name:'Preacher Curl',cat:'Arms',eq:'Barbell',muscles:['Biceps'],emoji:'🏋️'},
  {id:'e039',name:'Concentration Curl',cat:'Arms',eq:'Dumbbell',muscles:['Biceps'],emoji:'🥊'},
  {id:'e040',name:'Cable Curl',cat:'Arms',eq:'Cable',muscles:['Biceps'],emoji:'⚡'},
  {id:'e041',name:'Incline Dumbbell Curl',cat:'Arms',eq:'Dumbbell',muscles:['Biceps Long Head'],emoji:'🥊'},

  // ── TRICEPS ──
  {id:'e042',name:'Close-Grip Bench Press',cat:'Arms',eq:'Barbell',muscles:['Triceps','Chest'],emoji:'🏋️'},
  {id:'e043',name:'Tricep Pushdown',cat:'Arms',eq:'Cable',muscles:['Triceps'],emoji:'⚡'},
  {id:'e044',name:'Overhead Tricep Extension',cat:'Arms',eq:'Dumbbell',muscles:['Triceps Long Head'],emoji:'🥊'},
  {id:'e045',name:'Skull Crusher',cat:'Arms',eq:'Barbell',muscles:['Triceps'],emoji:'🏋️'},
  {id:'e046',name:'Tricep Dips',cat:'Arms',eq:'Bodyweight',muscles:['Triceps','Chest'],emoji:'💪'},
  {id:'e047',name:'Diamond Push-Up',cat:'Arms',eq:'Bodyweight',muscles:['Triceps'],emoji:'💪'},
  {id:'e048',name:'Overhead Cable Extension',cat:'Arms',eq:'Cable',muscles:['Triceps Long Head'],emoji:'⚡'},
  {id:'e049',name:'Tricep Kickback',cat:'Arms',eq:'Dumbbell',muscles:['Triceps'],emoji:'🥊'},

  // ── LEGS ──
  {id:'e050',name:'Barbell Squat',cat:'Legs',eq:'Barbell',muscles:['Quads','Glutes','Hamstrings'],emoji:'🏋️'},
  {id:'e051',name:'Front Squat',cat:'Legs',eq:'Barbell',muscles:['Quads','Core'],emoji:'🏋️'},
  {id:'e052',name:'Leg Press',cat:'Legs',eq:'Machine',muscles:['Quads','Glutes','Hamstrings'],emoji:'🔩'},
  {id:'e053',name:'Hack Squat',cat:'Legs',eq:'Machine',muscles:['Quads'],emoji:'🔩'},
  {id:'e054',name:'Bulgarian Split Squat',cat:'Legs',eq:'Dumbbell',muscles:['Quads','Glutes'],emoji:'🥊'},
  {id:'e055',name:'Walking Lunges',cat:'Legs',eq:'Dumbbell',muscles:['Quads','Glutes'],emoji:'🥊'},
  {id:'e056',name:'Leg Extension',cat:'Legs',eq:'Machine',muscles:['Quads'],emoji:'🔩'},
  {id:'e057',name:'Leg Curl',cat:'Legs',eq:'Machine',muscles:['Hamstrings'],emoji:'🔩'},
  {id:'e058',name:'Standing Calf Raise',cat:'Legs',eq:'Machine',muscles:['Calves'],emoji:'🔩'},
  {id:'e059',name:'Seated Calf Raise',cat:'Legs',eq:'Machine',muscles:['Soleus'],emoji:'🔩'},
  {id:'e060',name:'Hip Thrust',cat:'Legs',eq:'Barbell',muscles:['Glutes','Hamstrings'],emoji:'🏋️'},
  {id:'e061',name:'Glute Bridge',cat:'Legs',eq:'Bodyweight',muscles:['Glutes'],emoji:'💪'},
  {id:'e062',name:'Box Jump',cat:'Legs',eq:'Bodyweight',muscles:['Quads','Calves'],emoji:'💪'},
  {id:'e063',name:'Step-Up',cat:'Legs',eq:'Dumbbell',muscles:['Quads','Glutes'],emoji:'🥊'},
  {id:'e064',name:'Goblet Squat',cat:'Legs',eq:'Kettlebell',muscles:['Quads','Glutes'],emoji:'🔔'},
  {id:'e065',name:'Sumo Deadlift',cat:'Legs',eq:'Barbell',muscles:['Inner Thighs','Glutes','Hamstrings'],emoji:'🏋️'},

  // ── CORE ──
  {id:'e066',name:'Crunch',cat:'Core',eq:'Bodyweight',muscles:['Abs'],emoji:'💪'},
  {id:'e067',name:'Plank',cat:'Core',eq:'Bodyweight',muscles:['Core','Abs'],emoji:'💪'},
  {id:'e068',name:'Russian Twist',cat:'Core',eq:'Bodyweight',muscles:['Obliques'],emoji:'💪'},
  {id:'e069',name:'Leg Raise',cat:'Core',eq:'Bodyweight',muscles:['Lower Abs','Hip Flexors'],emoji:'💪'},
  {id:'e070',name:'Cable Crunch',cat:'Core',eq:'Cable',muscles:['Abs'],emoji:'⚡'},
  {id:'e071',name:'Ab Rollout',cat:'Core',eq:'Bodyweight',muscles:['Core','Abs'],emoji:'💪'},
  {id:'e072',name:'V-Up',cat:'Core',eq:'Bodyweight',muscles:['Abs'],emoji:'💪'},
  {id:'e073',name:'Bicycle Crunch',cat:'Core',eq:'Bodyweight',muscles:['Abs','Obliques'],emoji:'💪'},
  {id:'e074',name:'Mountain Climbers',cat:'Core',eq:'Bodyweight',muscles:['Core','Hip Flexors'],emoji:'💪'},
  {id:'e075',name:'Side Plank',cat:'Core',eq:'Bodyweight',muscles:['Obliques'],emoji:'💪'},
  {id:'e076',name:'Dead Bug',cat:'Core',eq:'Bodyweight',muscles:['Core','Abs'],emoji:'💪'},
  {id:'e077',name:'Hanging Leg Raise',cat:'Core',eq:'Bodyweight',muscles:['Lower Abs'],emoji:'💪'},

  // ── CARDIO ──
  {id:'e078',name:'Treadmill Run',cat:'Cardio',eq:'Machine',muscles:['Full Body'],emoji:'🏃'},
  {id:'e079',name:'Cycling',cat:'Cardio',eq:'Machine',muscles:['Legs','Cardio'],emoji:'🚴'},
  {id:'e080',name:'Jump Rope',cat:'Cardio',eq:'Bodyweight',muscles:['Calves','Cardio'],emoji:'🪂'},
  {id:'e081',name:'Rowing Machine',cat:'Cardio',eq:'Machine',muscles:['Back','Legs','Arms'],emoji:'🚣'},
  {id:'e082',name:'Stair Climber',cat:'Cardio',eq:'Machine',muscles:['Legs','Glutes'],emoji:'🏃'},
  {id:'e083',name:'Elliptical',cat:'Cardio',eq:'Machine',muscles:['Full Body'],emoji:'🏃'}
];

const PROGRAMS = [
  {
    id:'p001',
    name:'StrongLifts 5×5',
    desc:'The classic beginner barbell program. 3 days/week, alternating A/B workouts. Simple, effective, and battle-tested.',
    emoji:'🏋️',
    color:'#7c3aed',
    level:'Beginner',
    daysPerWeek:3,
    duration:'12 weeks',
    days:[
      {name:'Workout A',exercises:[
        {id:'e050',sets:5,reps:'5',rest:180},
        {id:'e001',sets:5,reps:'5',rest:180},
        {id:'e013',sets:5,reps:'5',rest:180}
      ]},
      {name:'Workout B',exercises:[
        {id:'e050',sets:5,reps:'5',rest:180},
        {id:'e024',sets:5,reps:'5',rest:180},
        {id:'e012',sets:1,reps:'5',rest:240}
      ]}
    ]
  },
  {
    id:'p002',
    name:'Push / Pull / Legs',
    desc:'Classic 6-day split for intermediate lifters. Optimal frequency and volume for hypertrophy.',
    emoji:'🔥',
    color:'#ef4444',
    level:'Intermediate',
    daysPerWeek:6,
    duration:'Ongoing',
    days:[
      {name:'Push',exercises:[
        {id:'e001',sets:4,reps:'6-10',rest:120},
        {id:'e005',sets:3,reps:'8-12',rest:90},
        {id:'e024',sets:4,reps:'6-10',rest:120},
        {id:'e025',sets:3,reps:'10-15',rest:90},
        {id:'e027',sets:4,reps:'12-20',rest:60},
        {id:'e043',sets:3,reps:'10-15',rest:60},
        {id:'e044',sets:3,reps:'10-15',rest:60}
      ]},
      {name:'Pull',exercises:[
        {id:'e012',sets:4,reps:'4-6',rest:180},
        {id:'e015',sets:3,reps:'6-10',rest:120},
        {id:'e017',sets:3,reps:'10-12',rest:90},
        {id:'e019',sets:3,reps:'8-12',rest:90},
        {id:'e018',sets:3,reps:'10-15',rest:75},
        {id:'e034',sets:3,reps:'10-15',rest:60},
        {id:'e037',sets:4,reps:'10-15',rest:60}
      ]},
      {name:'Legs',exercises:[
        {id:'e050',sets:4,reps:'6-10',rest:180},
        {id:'e052',sets:3,reps:'10-15',rest:120},
        {id:'e021',sets:3,reps:'8-12',rest:120},
        {id:'e056',sets:3,reps:'12-15',rest:75},
        {id:'e057',sets:3,reps:'10-12',rest:75},
        {id:'e058',sets:4,reps:'12-20',rest:60}
      ]}
    ]
  },
  {
    id:'p003',
    name:'Starting Strength',
    desc:'Mark Rippetoe\'s proven program. Focus on the big 4 lifts to build a strong foundation.',
    emoji:'💪',
    color:'#10b981',
    level:'Beginner',
    daysPerWeek:3,
    duration:'6 months',
    days:[
      {name:'Workout A',exercises:[
        {id:'e050',sets:3,reps:'5',rest:180},
        {id:'e001',sets:3,reps:'5',rest:180},
        {id:'e012',sets:1,reps:'5',rest:300}
      ]},
      {name:'Workout B',exercises:[
        {id:'e050',sets:3,reps:'5',rest:180},
        {id:'e024',sets:3,reps:'5',rest:180},
        {id:'e013',sets:3,reps:'5',rest:180}
      ]}
    ]
  },
  {
    id:'p004',
    name:'Upper / Lower Split',
    desc:'4-day split with upper and lower body focus. Great for intermediate lifters wanting more volume.',
    emoji:'⚡',
    color:'#f59e0b',
    level:'Intermediate',
    daysPerWeek:4,
    duration:'Ongoing',
    days:[
      {name:'Upper A (Strength)',exercises:[
        {id:'e001',sets:4,reps:'3-5',rest:180},
        {id:'e013',sets:4,reps:'3-5',rest:180},
        {id:'e024',sets:3,reps:'6-8',rest:120},
        {id:'e015',sets:3,reps:'6-8',rest:120},
        {id:'e034',sets:3,reps:'8-10',rest:90},
        {id:'e042',sets:3,reps:'8-10',rest:90}
      ]},
      {name:'Lower A (Strength)',exercises:[
        {id:'e050',sets:4,reps:'3-5',rest:240},
        {id:'e021',sets:3,reps:'6-8',rest:180},
        {id:'e052',sets:3,reps:'8-10',rest:120},
        {id:'e057',sets:3,reps:'8-10',rest:90},
        {id:'e058',sets:4,reps:'10-15',rest:60}
      ]},
      {name:'Upper B (Hypertrophy)',exercises:[
        {id:'e005',sets:4,reps:'8-12',rest:90},
        {id:'e017',sets:4,reps:'8-12',rest:90},
        {id:'e025',sets:3,reps:'10-15',rest:75},
        {id:'e018',sets:3,reps:'10-15',rest:75},
        {id:'e043',sets:3,reps:'12-15',rest:60},
        {id:'e027',sets:4,reps:'15-20',rest:60}
      ]},
      {name:'Lower B (Hypertrophy)',exercises:[
        {id:'e054',sets:4,reps:'8-12',rest:120},
        {id:'e056',sets:4,reps:'10-15',rest:75},
        {id:'e060',sets:3,reps:'8-12',rest:90},
        {id:'e057',sets:3,reps:'12-15',rest:75},
        {id:'e059',sets:4,reps:'12-20',rest:60}
      ]}
    ]
  },
  {
    id:'p005',
    name:'Full Body 3×/Week',
    desc:'Hit every muscle 3 times a week. Ideal for beginners and those with limited training time.',
    emoji:'🌟',
    color:'#06b6d4',
    level:'Beginner',
    daysPerWeek:3,
    duration:'Ongoing',
    days:[
      {name:'Full Body A',exercises:[
        {id:'e050',sets:3,reps:'8-10',rest:120},
        {id:'e001',sets:3,reps:'8-10',rest:120},
        {id:'e013',sets:3,reps:'8-10',rest:120},
        {id:'e024',sets:3,reps:'8-10',rest:120},
        {id:'e067',sets:3,reps:'30-60s',rest:60}
      ]},
      {name:'Full Body B',exercises:[
        {id:'e012',sets:3,reps:'5',rest:180},
        {id:'e015',sets:3,reps:'5-8',rest:120},
        {id:'e004',sets:3,reps:'8-12',rest:90},
        {id:'e027',sets:3,reps:'12-15',rest:60},
        {id:'e066',sets:3,reps:'15-20',rest:60}
      ]}
    ]
  }
];
