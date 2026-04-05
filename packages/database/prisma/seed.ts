import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const categories = [
  {
    slug: 'home-cleaning',
    icon: '🧹',
    sortOrder: 1,
    translations: {
      en: { name: 'Home Cleaning', description: 'Professional cleaning services for your home' },
      de: { name: 'Hausreinigung', description: 'Professionelle Reinigungsdienstleistungen' },
      fr: { name: 'Nettoyage à domicile', description: 'Services de nettoyage professionnels' },
      nl: { name: 'Schoonmaken', description: 'Professionele schoonmaakdiensten' },
      es: { name: 'Limpieza del hogar', description: 'Servicios de limpieza profesionales' },
    },
    services: [
      {
        slug: 'standard-cleaning',
        basePrice: 65,
        durationMinutes: 120,
        pricingType: 'FIXED' as const,
        translations: {
          en: {
            name: 'Standard Cleaning',
            description: 'Regular home cleaning including all main rooms',
            whatToExpect: 'Our cleaners will hoover, mop, dust, and clean surfaces in all rooms',
            includes: ['Vacuuming', 'Mopping floors', 'Dusting surfaces', 'Bathroom cleaning', 'Kitchen cleaning'],
          },
          de: {
            name: 'Standardreinigung',
            description: 'Regelmäßige Hausreinigung aller Haupträume',
            whatToExpect: 'Unsere Reinigungskräfte saugen, wischen und reinigen alle Räume',
            includes: ['Staubsaugen', 'Fegen und Wischen', 'Abstauben', 'Badezimmer reinigen', 'Küche reinigen'],
          },
          fr: {
            name: 'Nettoyage standard',
            description: 'Nettoyage régulier de votre domicile',
            whatToExpect: 'Nos agents feront l\'aspirateur, le nettoyage de toutes les pièces',
            includes: ['Aspirateur', 'Lavage des sols', 'Dépoussiérage', 'Salle de bain', 'Cuisine'],
          },
          nl: {
            name: 'Standaard schoonmaak',
            description: 'Reguliere reiniging van alle kamers',
            whatToExpect: 'Stofzuigen, dweilen en schoonmaken van alle kamers',
            includes: ['Stofzuigen', 'Dweilen', 'Afstoffen', 'Badkamer schoonmaken', 'Keuken schoonmaken'],
          },
          es: {
            name: 'Limpieza estándar',
            description: 'Limpieza regular del hogar en todas las habitaciones',
            whatToExpect: 'Nuestros limpiadores aspirarán, fregarán y limpiarán todas las habitaciones',
            includes: ['Aspirado', 'Fregado de suelos', 'Quitar el polvo', 'Baño', 'Cocina'],
          },
        },
      },
      {
        slug: 'deep-cleaning',
        basePrice: 120,
        durationMinutes: 240,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Deep Cleaning', description: 'Thorough top-to-bottom cleaning of your entire home', whatToExpect: 'Includes all standard cleaning plus inside oven, inside fridge, skirting boards, and window sills', includes: ['Everything in standard', 'Inside oven cleaning', 'Inside fridge cleaning', 'Skirting boards', 'Window sills'] },
          de: { name: 'Tiefenreinigung', description: 'Gründliche Reinigung Ihres gesamten Zuhauses', whatToExpect: 'Beinhaltet alle Standard-Reinigungen plus Backofen innen, Kühlschrank innen', includes: ['Alles aus Standard', 'Backofen innen', 'Kühlschrank innen', 'Sockelleisten', 'Fensterbänke'] },
          fr: { name: 'Nettoyage en profondeur', description: 'Nettoyage complet de votre domicile', whatToExpect: 'Inclut tout le nettoyage standard plus four, réfrigérateur', includes: ['Tout le standard', 'Intérieur du four', 'Intérieur du réfrigérateur', 'Plinthes', 'Rebords de fenêtres'] },
          nl: { name: 'Grondig schoonmaken', description: 'Grondige reiniging van uw woning', whatToExpect: 'Inclusief oven, koelkast en plinten', includes: ['Alles van standaard', 'Oven van binnen', 'Koelkast van binnen', 'Plinten', 'Vensterbanken'] },
          es: { name: 'Limpieza profunda', description: 'Limpieza exhaustiva de todo el hogar', whatToExpect: 'Incluye todo lo estándar más horno, nevera y rodapiés', includes: ['Todo lo estándar', 'Interior del horno', 'Interior de la nevera', 'Rodapiés', 'Alféizares'] },
        },
      },
      {
        slug: 'end-of-tenancy',
        basePrice: 180,
        durationMinutes: 360,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'End of Tenancy Cleaning', description: 'Move-out cleaning to help you get your deposit back', whatToExpect: 'Full deep clean to letting agency standards', includes: ['Full deep clean', 'Appliance cleaning', 'Cupboard interiors', 'Carpet steam cleaning', 'Window cleaning'] },
          de: { name: 'Auszugsreinigung', description: 'Reinigung beim Auszug für Ihre Kaution', whatToExpect: 'Vollständige Tiefenreinigung nach Vermietungsstandards', includes: ['Vollständige Tiefenreinigung', 'Gerätereinigung', 'Schrankinnenräume', 'Teppichreinigung', 'Fensterreinigung'] },
          fr: { name: 'Nettoyage fin de bail', description: 'Nettoyage de départ pour récupérer votre caution', whatToExpect: 'Nettoyage complet aux normes des agences immobilières', includes: ['Nettoyage complet', 'Nettoyage appareils', 'Intérieurs placards', 'Nettoyage moquette', 'Nettoyage vitres'] },
          nl: { name: 'Einde huurperiode reiniging', description: 'Reiniging bij vertrek voor uw borg', whatToExpect: 'Volledige grondig schoonmaak', includes: ['Volledige reiniging', 'Apparaten reinigen', 'Kastinterieurs', 'Tapijtreiniging', 'Ramen wassen'] },
          es: { name: 'Limpieza fin de alquiler', description: 'Limpieza de salida para recuperar tu fianza', whatToExpect: 'Limpieza completa a los estándares de las agencias', includes: ['Limpieza completa', 'Electrodomésticos', 'Interior armarios', 'Limpieza alfombras', 'Limpieza ventanas'] },
        },
      },
    ],
  },
  {
    slug: 'plumbing',
    icon: '🔧',
    sortOrder: 2,
    translations: {
      en: { name: 'Plumbing', description: 'Expert plumbing services for leaks, boilers and more' },
      de: { name: 'Klempner', description: 'Professionelle Klempnerarbeiten' },
      fr: { name: 'Plomberie', description: 'Services de plomberie professionnels' },
      nl: { name: 'Loodgieterswerk', description: 'Professionele loodgietersdiensten' },
      es: { name: 'Fontanería', description: 'Servicios de fontanería profesionales' },
    },
    services: [
      {
        slug: 'leak-repair',
        basePrice: 80,
        durationMinutes: 90,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Leak Repair', description: 'Fix dripping taps, leaking pipes and water damage', whatToExpect: 'Plumber will diagnose and repair the leak', includes: ['Leak diagnosis', 'Pipe repair or replacement', 'Tap repair', 'Basic materials included'] },
          de: { name: 'Leckage-Reparatur', description: 'Reparatur von tropfenden Hähnen und undichten Rohren', whatToExpect: 'Klempner diagnostiziert und repariert das Leck', includes: ['Leckdiagnose', 'Rohr-Reparatur', 'Hahn-Reparatur', 'Grundmaterial inklusive'] },
          fr: { name: 'Réparation de fuite', description: 'Réparation de robinets qui gouttent et tuyaux qui fuient', whatToExpect: 'Le plombier diagnostiquera et réparera la fuite', includes: ['Diagnostic de fuite', 'Réparation ou remplacement', 'Robinetterie', 'Matériaux de base inclus'] },
          nl: { name: 'Lekreparatie', description: 'Reparatie van lekkende kranen en leidingen', whatToExpect: 'Loodgieter diagnosticeert en repareert het lek', includes: ['Lekdiagnose', 'Leidingreparatie', 'Kraanreparatie', 'Basismateriaal inbegrepen'] },
          es: { name: 'Reparación de fugas', description: 'Reparación de grifos que gotean y tuberías con fugas', whatToExpect: 'El fontanero diagnosticará y reparará la fuga', includes: ['Diagnóstico de fuga', 'Reparación de tuberías', 'Reparación de grifo', 'Materiales básicos incluidos'] },
        },
      },
      {
        slug: 'boiler-service',
        basePrice: 110,
        durationMinutes: 90,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Boiler Service', description: 'Annual boiler servicing and safety check', whatToExpect: 'Gas Safe registered engineer will service your boiler', includes: ['Full boiler inspection', 'Safety checks', 'Flue test', 'Gas pressure test', 'Service certificate'] },
          de: { name: 'Heizungsservice', description: 'Jährliche Heizungswartung und Sicherheitsprüfung', whatToExpect: 'Zertifizierter Heizungsmonteur wartet Ihre Heizung', includes: ['Vollständige Heizungsinspektion', 'Sicherheitsprüfungen', 'Abgastest', 'Gasdrucktest', 'Servicezertifikat'] },
          fr: { name: 'Entretien chaudière', description: 'Entretien annuel et contrôle de sécurité', whatToExpect: 'Technicien certifié effectuera l\'entretien', includes: ['Inspection complète', 'Contrôles de sécurité', 'Test des fumées', 'Test de pression', 'Certificat d\'entretien'] },
          nl: { name: 'Ketelonderhoud', description: 'Jaarlijks ketelonderhoud en veiligheidscheck', whatToExpect: 'Gecertificeerde monteur onderhoudt uw ketel', includes: ['Volledige inspectie', 'Veiligheidscontroles', 'Rookgastest', 'Gasdruktest', 'Onderhoudscertificaat'] },
          es: { name: 'Servicio de caldera', description: 'Mantenimiento anual de caldera y revisión de seguridad', whatToExpect: 'Técnico certificado realizará el mantenimiento', includes: ['Inspección completa', 'Controles de seguridad', 'Prueba de gases', 'Prueba de presión', 'Certificado de mantenimiento'] },
        },
      },
    ],
  },
  {
    slug: 'electrical',
    icon: '⚡',
    sortOrder: 3,
    translations: {
      en: { name: 'Electrical', description: 'Certified electricians for all your electrical needs' },
      de: { name: 'Elektro', description: 'Zertifizierte Elektriker für Ihre Bedürfnisse' },
      fr: { name: 'Électricité', description: 'Électriciens certifiés pour tous vos besoins' },
      nl: { name: 'Elektra', description: 'Gecertificeerde elektriciens voor al uw behoeften' },
      es: { name: 'Electricidad', description: 'Electricistas certificados para todas sus necesidades' },
    },
    services: [
      {
        slug: 'socket-installation',
        basePrice: 60,
        durationMinutes: 60,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Socket & Switch Installation', description: 'Install new sockets, light switches and USB outlets', whatToExpect: 'Certified electrician will install your new sockets safely', includes: ['Socket installation', 'Switch installation', 'Safety testing', 'Completion certificate'] },
          de: { name: 'Steckdosen- & Schalterinstallation', description: 'Neue Steckdosen und Lichtschalter installieren', whatToExpect: 'Zertifizierter Elektriker installiert Ihre neuen Steckdosen sicher', includes: ['Steckdoseninstallation', 'Schalterinstallation', 'Sicherheitstest', 'Fertigstellungszertifikat'] },
          fr: { name: 'Installation de prises et interrupteurs', description: 'Installer de nouvelles prises et interrupteurs', whatToExpect: 'Électricien certifié installera vos nouvelles prises', includes: ['Installation de prises', 'Installation d\'interrupteurs', 'Tests de sécurité', 'Certificat'] },
          nl: { name: 'Stopcontact & schakelaar installatie', description: 'Nieuwe stopcontacten en schakelaars installeren', whatToExpect: 'Gecertificeerde elektricien installeert uw nieuwe stopcontacten', includes: ['Stopcontact installatie', 'Schakelaar installatie', 'Veiligheidstest', 'Certificaat'] },
          es: { name: 'Instalación de enchufes e interruptores', description: 'Instalar nuevos enchufes e interruptores de luz', whatToExpect: 'Electricista certificado instalará sus nuevos enchufes', includes: ['Instalación de enchufes', 'Instalación de interruptores', 'Pruebas de seguridad', 'Certificado'] },
        },
      },
      {
        slug: 'ev-charger-installation',
        basePrice: 450,
        durationMinutes: 240,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'EV Charger Installation', description: 'Home electric vehicle charger installation', whatToExpect: 'OZEV-certified installer will fit your home EV charger', includes: ['Survey', 'Installation', 'Commissioning', 'OZEV grant application support', 'Warranty'] },
          de: { name: 'Wallbox-Installation', description: 'Heimladestation für Elektrofahrzeuge', whatToExpect: 'Zertifizierter Installateur montiert Ihre Wallbox', includes: ['Besichtigung', 'Installation', 'Inbetriebnahme', 'Förderantrag', 'Garantie'] },
          fr: { name: 'Installation borne de recharge VE', description: 'Borne de recharge pour véhicule électrique à domicile', whatToExpect: 'Installateur certifié installe votre borne', includes: ['Visite', 'Installation', 'Mise en service', 'Aide à la subvention', 'Garantie'] },
          nl: { name: 'Laadpaal installatie', description: 'Thuislader voor elektrische voertuigen', whatToExpect: 'Gecertificeerde installateur monteert uw laadpaal', includes: ['Inspectie', 'Installatie', 'Inbedrijfstelling', 'Subsidieaanvraag', 'Garantie'] },
          es: { name: 'Instalación cargador VE', description: 'Cargador doméstico para vehículos eléctricos', whatToExpect: 'Instalador certificado instalará su cargador', includes: ['Inspección', 'Instalación', 'Puesta en marcha', 'Ayuda a subvención', 'Garantía'] },
        },
      },
    ],
  },
  {
    slug: 'beauty-wellness',
    icon: '💆',
    sortOrder: 4,
    translations: {
      en: { name: 'Beauty & Wellness', description: 'Professional beauty treatments at home' },
      de: { name: 'Schönheit & Wellness', description: 'Professionelle Schönheitsbehandlungen zu Hause' },
      fr: { name: 'Beauté & Bien-être', description: 'Soins de beauté professionnels à domicile' },
      nl: { name: 'Beauty & Wellness', description: 'Professionele schoonheidsbehandelingen thuis' },
      es: { name: 'Belleza & Bienestar', description: 'Tratamientos de belleza profesionales en casa' },
    },
    services: [
      {
        slug: 'full-body-massage',
        basePrice: 75,
        durationMinutes: 60,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Full Body Massage', description: 'Relaxing full body massage in the comfort of your home', whatToExpect: 'Therapist brings a portable massage table and oils', includes: ['60 min massage', 'Massage oils', 'Portable table'] },
          de: { name: 'Ganzkörpermassage', description: 'Entspannende Ganzkörpermassage zu Hause', whatToExpect: 'Therapeut bringt Massageliege und Öle mit', includes: ['60 Min Massage', 'Massageöle', 'Transportable Liege'] },
          fr: { name: 'Massage corps entier', description: 'Massage relaxant du corps entier à domicile', whatToExpect: 'Le thérapeute apporte une table de massage portable', includes: ['60 min de massage', 'Huiles de massage', 'Table portable'] },
          nl: { name: 'Volledige lichaamsmassage', description: 'Ontspannende volledige lichaamsmassage thuis', whatToExpect: 'Therapeut brengt een draagbare massagetafel en oliën mee', includes: ['60 min massage', 'Massageoliën', 'Draagbare tafel'] },
          es: { name: 'Masaje de cuerpo completo', description: 'Masaje relajante de cuerpo completo en casa', whatToExpect: 'El terapeuta trae una camilla portátil y aceites', includes: ['60 min de masaje', 'Aceites de masaje', 'Camilla portátil'] },
        },
      },
      {
        slug: 'manicure-pedicure',
        basePrice: 55,
        durationMinutes: 90,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Manicure & Pedicure', description: 'Professional nail care at home', whatToExpect: 'Nail technician will bring all equipment needed', includes: ['Manicure', 'Pedicure', 'Nail polish', 'Cuticle care', 'All equipment included'] },
          de: { name: 'Maniküre & Pediküre', description: 'Professionelle Nagelpflege zu Hause', whatToExpect: 'Nageldesignerin bringt alle Ausrüstung mit', includes: ['Maniküre', 'Pediküre', 'Nagellack', 'Nagelhautpflege', 'Alle Ausrüstung inklusive'] },
          fr: { name: 'Manucure & Pédicure', description: 'Soin des ongles professionnel à domicile', whatToExpect: 'La prothésiste ongulaire apporte tout l\'équipement', includes: ['Manucure', 'Pédicure', 'Vernis', 'Soin des cuticules', 'Tout l\'équipement inclus'] },
          nl: { name: 'Manicure & Pedicure', description: 'Professionele nagelzorg thuis', whatToExpect: 'Nageltechnicus brengt alle benodigde apparatuur mee', includes: ['Manicure', 'Pedicure', 'Nagellak', 'Nagelriemverzorging', 'Alle apparatuur inbegrepen'] },
          es: { name: 'Manicura & Pedicura', description: 'Cuidado profesional de uñas en casa', whatToExpect: 'La técnica de uñas traerá todo el equipo necesario', includes: ['Manicura', 'Pedicura', 'Esmalte', 'Cuidado de cutículas', 'Todo el equipo incluido'] },
        },
      },
    ],
  },
  {
    slug: 'painting-decorating',
    icon: '🎨',
    sortOrder: 5,
    translations: {
      en: { name: 'Painting & Decorating', description: 'Professional painters and decorators' },
      de: { name: 'Malen & Dekorieren', description: 'Professionelle Maler und Dekorateure' },
      fr: { name: 'Peinture & Décoration', description: 'Peintres et décorateurs professionnels' },
      nl: { name: 'Schilderen & Decoreren', description: 'Professionele schilders en decorateurs' },
      es: { name: 'Pintura & Decoración', description: 'Pintores y decoradores profesionales' },
    },
    services: [
      {
        slug: 'interior-painting',
        basePrice: 150,
        durationMinutes: 480,
        pricingType: 'HOURLY' as const,
        translations: {
          en: { name: 'Interior Painting', description: 'Professional interior room painting', whatToExpect: 'Painter will prepare surfaces, apply paint and clean up', includes: ['Surface preparation', '2 coats of paint', 'Paint included', 'Clean up', 'Furniture protection'] },
          de: { name: 'Innenraummalerei', description: 'Professionelles Streichen von Innenräumen', whatToExpect: 'Maler bereitet Oberflächen vor und streicht mit 2 Schichten', includes: ['Oberflächenvorbereitung', '2 Anstriche', 'Farbe inklusive', 'Aufräumen', 'Möbelschutz'] },
          fr: { name: 'Peinture intérieure', description: 'Peinture professionnelle de pièces', whatToExpect: 'Le peintre prépare les surfaces et applique 2 couches', includes: ['Préparation des surfaces', '2 couches de peinture', 'Peinture incluse', 'Nettoyage', 'Protection des meubles'] },
          nl: { name: 'Binnenschilderwerk', description: 'Professioneel schilderwerk binnen', whatToExpect: 'Schilder bereidt oppervlakken voor en brengt 2 lagen aan', includes: ['Oppervlakvoorbereiding', '2 lagen verf', 'Verf inbegrepen', 'Opruimen', 'Meubelbeveiliging'] },
          es: { name: 'Pintura interior', description: 'Pintura profesional de habitaciones interiores', whatToExpect: 'El pintor preparará las superficies y aplicará 2 capas', includes: ['Preparación de superficies', '2 manos de pintura', 'Pintura incluida', 'Limpieza', 'Protección de muebles'] },
        },
      },
    ],
  },
  {
    slug: 'carpentry',
    icon: '🪚',
    sortOrder: 6,
    translations: {
      en: { name: 'Carpentry', description: 'Skilled carpenters for furniture assembly and repairs' },
      de: { name: 'Tischlerei', description: 'Erfahrene Tischler für Möbelaufbau und Reparaturen' },
      fr: { name: 'Menuiserie', description: 'Menuisiers qualifiés pour l\'assemblage et les réparations' },
      nl: { name: 'Timmerman', description: 'Vaardige timmerlieden voor meubelmontage en reparaties' },
      es: { name: 'Carpintería', description: 'Carpinteros calificados para montaje y reparaciones' },
    },
    services: [
      {
        slug: 'flat-pack-assembly',
        basePrice: 50,
        durationMinutes: 120,
        pricingType: 'HOURLY' as const,
        translations: {
          en: { name: 'Flat Pack Assembly', description: 'Expert assembly of IKEA and flat pack furniture', whatToExpect: 'Carpenter will assemble your furniture quickly and professionally', includes: ['Assembly of furniture', 'Wall fixing if required', 'Packaging removal'] },
          de: { name: 'Möbelaufbau', description: 'Professioneller Aufbau von IKEA und Möbelbausätzen', whatToExpect: 'Tischler baut Ihre Möbel schnell und professionell auf', includes: ['Möbelmontage', 'Wandbefestigung falls nötig', 'Verpackungsentfernung'] },
          fr: { name: 'Montage de meubles en kit', description: 'Montage expert de meubles IKEA et en kit', whatToExpect: 'Le menuisier assemblera vos meubles rapidement', includes: ['Assemblage des meubles', 'Fixation murale si nécessaire', 'Enlèvement des emballages'] },
          nl: { name: 'Flatpack montage', description: 'Expertmontage van IKEA en flatpack meubels', whatToExpect: 'Timmerman monteert uw meubels snel en professioneel', includes: ['Meubelmontage', 'Wandbevestiging indien nodig', 'Verwijdering verpakking'] },
          es: { name: 'Montaje de muebles', description: 'Montaje experto de muebles IKEA y en kit', whatToExpect: 'El carpintero ensamblará sus muebles rápida y profesionalmente', includes: ['Montaje de muebles', 'Fijación a la pared si es necesario', 'Retirada de embalajes'] },
        },
      },
    ],
  },
  {
    slug: 'appliance-repair',
    icon: '🔨',
    sortOrder: 7,
    translations: {
      en: { name: 'Appliance Repair', description: 'Expert repair for washing machines, dishwashers and more' },
      de: { name: 'Gerätereparatur', description: 'Professionelle Reparatur von Haushaltsgeräten' },
      fr: { name: 'Réparation d\'électroménager', description: 'Réparation experte de vos appareils' },
      nl: { name: 'Apparaatreparatie', description: 'Deskundige reparatie van huishoudelijke apparaten' },
      es: { name: 'Reparación de electrodomésticos', description: 'Reparación experta de electrodomésticos' },
    },
    services: [
      {
        slug: 'washing-machine-repair',
        basePrice: 90,
        durationMinutes: 90,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Washing Machine Repair', description: 'Fix your washing machine — leaks, not spinning, error codes', whatToExpect: 'Engineer will diagnose and repair your washing machine', includes: ['Diagnosis', 'Labour', 'Up to 1 hour repair', 'Call-out included'] },
          de: { name: 'Waschmaschine Reparatur', description: 'Waschmaschine reparieren — Lecks, Schleuderproblem', whatToExpect: 'Techniker diagnostiziert und repariert Ihre Waschmaschine', includes: ['Diagnose', 'Arbeitskosten', 'Bis zu 1 Stunde Reparatur', 'Anfahrt inklusive'] },
          fr: { name: 'Réparation machine à laver', description: 'Réparer votre machine à laver — fuites, essorage', whatToExpect: 'Le technicien diagnostiquera et réparera votre machine', includes: ['Diagnostic', 'Main d\'œuvre', 'Jusqu\'à 1h de réparation', 'Déplacement inclus'] },
          nl: { name: 'Wasmachine reparatie', description: 'Repareer uw wasmachine — lekken, centrifugeproblemen', whatToExpect: 'Monteur diagnosticeert en repareert uw wasmachine', includes: ['Diagnose', 'Arbeid', 'Tot 1 uur reparatie', 'Voorrijkosten inbegrepen'] },
          es: { name: 'Reparación lavadora', description: 'Reparar su lavadora — fugas, centrifugado', whatToExpect: 'El técnico diagnosticará y reparará su lavadora', includes: ['Diagnóstico', 'Mano de obra', 'Hasta 1 hora de reparación', 'Desplazamiento incluido'] },
        },
      },
    ],
  },
  {
    slug: 'pest-control',
    icon: '🐛',
    sortOrder: 8,
    translations: {
      en: { name: 'Pest Control', description: 'Professional pest extermination services' },
      de: { name: 'Schädlingsbekämpfung', description: 'Professionelle Schädlingsbekämpfung' },
      fr: { name: 'Dératisation', description: 'Services professionnels de désinsectisation' },
      nl: { name: 'Ongediertebestrijding', description: 'Professionele ongediertebestrijding' },
      es: { name: 'Control de plagas', description: 'Servicios profesionales de control de plagas' },
    },
    services: [
      {
        slug: 'cockroach-treatment',
        basePrice: 120,
        durationMinutes: 120,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Cockroach Treatment', description: 'Professional cockroach extermination', whatToExpect: 'Pest controller will treat all affected areas', includes: ['Full property inspection', 'Professional treatment', 'Follow-up visit', 'Guarantee period'] },
          de: { name: 'Kakerlaken-Behandlung', description: 'Professionelle Kakerlaken-Bekämpfung', whatToExpect: 'Schädlingsbekämpfer behandelt alle befallenen Bereiche', includes: ['Vollständige Inspektion', 'Professionelle Behandlung', 'Nachkontrolle', 'Garantiezeitraum'] },
          fr: { name: 'Traitement cafards', description: 'Extermination professionnelle des cafards', whatToExpect: 'L\'expert traitera toutes les zones touchées', includes: ['Inspection complète', 'Traitement professionnel', 'Visite de suivi', 'Période de garantie'] },
          nl: { name: 'Kakkerlakkenbehandeling', description: 'Professionele kakkerlakkenbestrijding', whatToExpect: 'Ongediertebestrijder behandelt alle getroffen gebieden', includes: ['Volledige inspectie', 'Professionele behandeling', 'Vervolgbezoek', 'Garantieperiode'] },
          es: { name: 'Tratamiento de cucarachas', description: 'Exterminación profesional de cucarachas', whatToExpect: 'El controlador de plagas tratará todas las áreas afectadas', includes: ['Inspección completa', 'Tratamiento profesional', 'Visita de seguimiento', 'Período de garantía'] },
        },
      },
    ],
  },
  {
    slug: 'hvac',
    icon: '❄️',
    sortOrder: 9,
    translations: {
      en: { name: 'HVAC', description: 'Air conditioning and heating services' },
      de: { name: 'Heizung & Klima', description: 'Klimaanlagen und Heizungsdienstleistungen' },
      fr: { name: 'Climatisation & Chauffage', description: 'Services de climatisation et chauffage' },
      nl: { name: 'HVAC', description: 'Airconditioning en verwarmingsdiensten' },
      es: { name: 'Climatización', description: 'Servicios de aire acondicionado y calefacción' },
    },
    services: [
      {
        slug: 'ac-service',
        basePrice: 90,
        durationMinutes: 90,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'AC Service & Clean', description: 'Air conditioning unit service and deep clean', whatToExpect: 'Engineer will service and clean your AC unit', includes: ['Filter cleaning', 'Coil cleaning', 'Gas check', 'Performance test'] },
          de: { name: 'Klimaanlage Service', description: 'Klimaanlage warten und reinigen', whatToExpect: 'Techniker wartet und reinigt Ihre Klimaanlage', includes: ['Filterreinigung', 'Spulenreinigung', 'Gasprüfung', 'Leistungstest'] },
          fr: { name: 'Entretien climatiseur', description: 'Entretien et nettoyage de votre climatiseur', whatToExpect: 'Le technicien entretiendra et nettoiera votre climatiseur', includes: ['Nettoyage des filtres', 'Nettoyage des bobines', 'Vérification du gaz', 'Test de performance'] },
          nl: { name: 'Airco service', description: 'Onderhoud en reiniging van airconditioning', whatToExpect: 'Monteur onderhoudt en reinigt uw airconditioning', includes: ['Filterreiniging', 'Spoelreiniging', 'Gascontrole', 'Prestatietest'] },
          es: { name: 'Servicio de aire acondicionado', description: 'Mantenimiento y limpieza de aire acondicionado', whatToExpect: 'El técnico mantendrá y limpiará su aire acondicionado', includes: ['Limpieza de filtros', 'Limpieza de bobinas', 'Comprobación de gas', 'Prueba de rendimiento'] },
        },
      },
    ],
  },
  {
    slug: 'gardening',
    icon: '🌿',
    sortOrder: 10,
    translations: {
      en: { name: 'Gardening', description: 'Professional garden maintenance and landscaping' },
      de: { name: 'Gartenarbeit', description: 'Professionelle Gartenpflege' },
      fr: { name: 'Jardinage', description: 'Entretien professionnel de jardin' },
      nl: { name: 'Tuinieren', description: 'Professioneel tuinonderhoud' },
      es: { name: 'Jardinería', description: 'Mantenimiento profesional del jardín' },
    },
    services: [
      {
        slug: 'lawn-mowing',
        basePrice: 40,
        durationMinutes: 60,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'Lawn Mowing', description: 'Professional lawn cutting and edging', whatToExpect: 'Gardener will mow and edge your lawn to a professional standard', includes: ['Lawn mowing', 'Edging', 'Grass clippings removed'] },
          de: { name: 'Rasenmähen', description: 'Professionelles Rasenmähen und Kantenstechen', whatToExpect: 'Gärtner mäht und kantet Ihren Rasen professionell', includes: ['Rasenmähen', 'Kantenstechen', 'Rasenschnitt entfernen'] },
          fr: { name: 'Tonte de pelouse', description: 'Tonte professionnelle de votre pelouse', whatToExpect: 'Le jardinier tondra votre pelouse professionnellement', includes: ['Tonte', 'Bordure', 'Évacuation des déchets'] },
          nl: { name: 'Gazon maaien', description: 'Professioneel gazon maaien', whatToExpect: 'Tuinman maait uw gazon professioneel', includes: ['Gazon maaien', 'Rand maaien', 'Grasafval verwijderen'] },
          es: { name: 'Corte de césped', description: 'Corte profesional del césped', whatToExpect: 'El jardinero cortará su césped profesionalmente', includes: ['Corte de césped', 'Bordeado', 'Retirada de recortes'] },
        },
      },
    ],
  },
  {
    slug: 'moving-delivery',
    icon: '📦',
    sortOrder: 11,
    translations: {
      en: { name: 'Moving & Delivery', description: 'Home moves and single item delivery' },
      de: { name: 'Umzug & Lieferung', description: 'Umzüge und Einzeltransporte' },
      fr: { name: 'Déménagement & Livraison', description: 'Déménagements et livraisons' },
      nl: { name: 'Verhuizen & Bezorgen', description: 'Verhuizingen en bezorging' },
      es: { name: 'Mudanzas & Entregas', description: 'Mudanzas y entregas individuales' },
    },
    services: [
      {
        slug: 'small-move',
        basePrice: 80,
        durationMinutes: 180,
        pricingType: 'HOURLY' as const,
        translations: {
          en: { name: 'Small Move', description: 'Move a few items or studio flat move', whatToExpect: 'Team will carefully move your items from A to B', includes: ['Up to 2 movers', 'Van included', 'Basic furniture wrapping', 'Fuel included'] },
          de: { name: 'Kleintransport', description: 'Wenige Gegenstände oder Zimmerwohnungsumzug', whatToExpect: 'Team bewegt Ihre Gegenstände sicher von A nach B', includes: ['Bis zu 2 Träger', 'Transporter inklusive', 'Grundschutzverpackung', 'Kraftstoff inklusive'] },
          fr: { name: 'Petit déménagement', description: 'Quelques objets ou déménagement de studio', whatToExpect: 'L\'équipe déplacera vos affaires de A à B', includes: ['Jusqu\'à 2 déménageurs', 'Camionnette incluse', 'Emballage de base', 'Carburant inclus'] },
          nl: { name: 'Kleine verhuizing', description: 'Paar items of studio verhuizing', whatToExpect: 'Team verplaatst uw spullen van A naar B', includes: ['Tot 2 verhuizers', 'Bestelbus inbegrepen', 'Basis verpakking', 'Brandstof inbegrepen'] },
          es: { name: 'Mudanza pequeña', description: 'Pocos objetos o mudanza de estudio', whatToExpect: 'El equipo moverá sus cosas de A a B', includes: ['Hasta 2 mozos', 'Furgoneta incluida', 'Embalaje básico', 'Combustible incluido'] },
        },
      },
    ],
  },
  {
    slug: 'handyman',
    icon: '🛠️',
    sortOrder: 12,
    translations: {
      en: { name: 'Handyman', description: 'General repairs and odd jobs around the home' },
      de: { name: 'Heimwerker', description: 'Allgemeine Reparaturen und Heimwerkerarbeiten' },
      fr: { name: 'Homme à tout faire', description: 'Réparations générales et petits travaux' },
      nl: { name: 'Klusjesman', description: 'Algemene reparaties en klusjes thuis' },
      es: { name: 'Manitas', description: 'Reparaciones generales y trabajos varios en el hogar' },
    },
    services: [
      {
        slug: 'tv-mounting',
        basePrice: 50,
        durationMinutes: 60,
        pricingType: 'FIXED' as const,
        translations: {
          en: { name: 'TV Mounting', description: 'Professional TV wall mounting service', whatToExpect: 'Handyman will mount your TV safely on the wall', includes: ['TV mounting', 'Cable management', 'Wall bracket included', 'Testing'] },
          de: { name: 'TV-Wandmontage', description: 'Professionelle TV-Wandmontage', whatToExpect: 'Heimwerker montiert Ihren TV sicher an der Wand', includes: ['TV-Montage', 'Kabelverwaltung', 'Wandhalterung inklusive', 'Test'] },
          fr: { name: 'Fixation TV murale', description: 'Service professionnel de fixation TV au mur', whatToExpect: 'Le technicien fixera votre TV au mur en toute sécurité', includes: ['Fixation TV', 'Gestion des câbles', 'Support mural inclus', 'Test'] },
          nl: { name: 'TV wandmontage', description: 'Professionele TV wandmontage service', whatToExpect: 'Klusjesman monteert uw TV veilig aan de muur', includes: ['TV montage', 'Kabelbeheer', 'Wandbeugel inbegrepen', 'Testen'] },
          es: { name: 'Instalación TV en pared', description: 'Servicio profesional de montaje de TV en pared', whatToExpect: 'El manitas montará su TV de forma segura en la pared', includes: ['Montaje TV', 'Gestión de cables', 'Soporte de pared incluido', 'Pruebas'] },
        },
      },
    ],
  },
]

const cities = [
  { name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278 },
  { name: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
  { name: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.availabilityBlock.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.providerService.deleteMany()
  await prisma.providerDocument.deleteMany()
  await prisma.provider.deleteMany()
  await prisma.emailVerificationToken.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.serviceAddonTranslation.deleteMany()
  await prisma.serviceAddon.deleteMany()
  await prisma.serviceTranslation.deleteMany()
  await prisma.service.deleteMany()
  await prisma.serviceCategoryTranslation.deleteMany()
  await prisma.serviceCategory.deleteMany()

  // Seed categories and services
  console.log('📂 Seeding service categories...')
  const createdCategories: { [slug: string]: string } = {}
  const createdServices: { id: string; slug: string }[] = []

  for (const cat of categories) {
    const category = await prisma.serviceCategory.create({
      data: {
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        translations: {
          create: Object.entries(cat.translations).map(([locale, t]) => ({
            locale,
            name: t.name,
            description: t.description,
          })),
        },
      },
    })
    createdCategories[cat.slug] = category.id

    for (const svc of cat.services) {
      const service = await prisma.service.create({
        data: {
          categoryId: category.id,
          slug: svc.slug,
          basePrice: svc.basePrice,
          durationMinutes: svc.durationMinutes,
          pricingType: svc.pricingType,
          translations: {
            create: Object.entries(svc.translations).map(([locale, t]) => ({
              locale,
              name: t.name,
              description: t.description,
              whatToExpect: t.whatToExpect,
              includes: t.includes,
            })),
          },
        },
      })
      createdServices.push({ id: service.id, slug: service.slug })
    }
  }
  console.log(`✅ Created ${createdServices.length} services in ${categories.length} categories`)

  // Seed providers
  console.log('👷 Seeding providers...')
  const passwordHash = await bcrypt.hash('Password123!', 12)

  for (let i = 0; i < 20; i++) {
    const city = cities[i % cities.length]
    const locale = { GB: 'en', DE: 'de', FR: 'fr', NL: 'nl', ES: 'es' }[city.country] ?? 'en'
    const currency = city.country === 'GB' ? 'GBP' : 'EUR'

    const user = await prisma.user.create({
      data: {
        email: `provider${i + 1}@servifyeu-seed.com`,
        passwordHash,
        firstName: `Provider`,
        lastName: `${i + 1}`,
        emailVerified: true,
        status: 'ACTIVE',
        role: 'PROVIDER',
        locale,
        currency,
        countryCode: city.country,
        gdprConsentAt: new Date(),
      },
    })

    // Slight location variation
    const latOffset = (Math.random() - 0.5) * 0.1
    const lngOffset = (Math.random() - 0.5) * 0.1

    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        bio: `Experienced professional based in ${city.name} with ${3 + (i % 10)} years of experience.`,
        yearsExperience: 3 + (i % 10),
        serviceRadius: 15 + (i % 10),
        latitude: city.lat + latOffset,
        longitude: city.lng + lngOffset,
        rating: 3.5 + (Math.random() * 1.5),
        reviewCount: Math.floor(Math.random() * 50) + 5,
        completedJobs: Math.floor(Math.random() * 100) + 20,
        isBackgroundChecked: true,
        kycStatus: 'APPROVED',
        isOnline: i % 3 === 0,
      },
    })

    // Assign 3-5 random services
    const numServices = 3 + (i % 3)
    const shuffled = [...createdServices].sort(() => Math.random() - 0.5)
    for (const svc of shuffled.slice(0, numServices)) {
      await prisma.providerService.create({
        data: {
          providerId: provider.id,
          serviceId: svc.id,
          isActive: true,
        },
      })
    }

    // Set weekly availability (Mon-Sat, 8am-6pm)
    for (let day = 1; day <= 6; day++) {
      await prisma.availability.create({
        data: {
          providerId: provider.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '18:00',
          isActive: true,
        },
      })
    }
  }

  // Seed a test customer
  await prisma.user.create({
    data: {
      email: 'customer@servifyeu-test.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'Customer',
      emailVerified: true,
      status: 'ACTIVE',
      role: 'CUSTOMER',
      locale: 'en',
      currency: 'GBP',
      countryCode: 'GB',
      gdprConsentAt: new Date(),
    },
  })

  // Seed an admin user
  await prisma.user.create({
    data: {
      email: 'admin@servifyeu.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      status: 'ACTIVE',
      role: 'SUPERADMIN',
      locale: 'en',
      currency: 'EUR',
      countryCode: 'DE',
      gdprConsentAt: new Date(),
    },
  })

  console.log('✅ Seeded 20 providers, 1 test customer, 1 admin')
  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
