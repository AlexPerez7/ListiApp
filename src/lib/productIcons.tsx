// Ilustraciones simples y coloridas para el catálogo de productos comunes
// (ver lib/productCatalog.ts), en reemplazo de los emojis genéricos. Un
// ícono puede representar varios productos parecidos (ej: "meat" cubre
// carne molida, bife y milanesa).
//
// Algunas claves tienen además una foto real genérica (ver PHOTOS más abajo);
// cuando existe, se muestra en vez del dibujo.
import type { ReactElement } from 'react'
import appleImg from '../assets/products/apple.webp'
import nuggetsImg from '../assets/products/nuggets.webp'
import cucumberImg from '../assets/products/cucumber.webp'
import milkImg from '../assets/products/milk.webp'
import pattyRawImg from '../assets/products/pattyRaw.webp'
import meatImg from '../assets/products/meat.webp'
import cleaningImg from '../assets/products/cleaning.webp'
import deodorantImg from '../assets/products/deodorant.webp'
import oilImg from '../assets/products/oil.webp'
import celeryImg from '../assets/products/celery.webp'
import eggImg from '../assets/products/egg.webp'
import avocadoImg from '../assets/products/avocado.webp'
import tomatoImg from '../assets/products/tomato.webp'
import carrotImg from '../assets/products/carrot.webp'
import riceImg from '../assets/products/rice.webp'
import shampooImg from '../assets/products/shampoo.webp'
import bananaImg from '../assets/products/banana.webp'
import cornImg from '../assets/products/corn.webp'
import grapesImg from '../assets/products/grapes.webp'
import leafyImg from '../assets/products/leafy.webp'
import citrusImg from '../assets/products/citrus.webp'
import pearImg from '../assets/products/pear.webp'
import pineappleImg from '../assets/products/pineapple.webp'
import strawberryImg from '../assets/products/strawberry.webp'
import watermelonImg from '../assets/products/watermelon.webp'
import garlicImg from '../assets/products/garlic.webp'
import lemonImg from '../assets/products/lemon.webp'
import onionImg from '../assets/products/onion.webp'
import pepperImg from '../assets/products/pepper.webp'
import potatoImg from '../assets/products/potato.webp'
import cayenneImg from '../assets/products/cayenne.webp'
import asadoImg from '../assets/products/asado.webp'
import steakImg from '../assets/products/steak.webp'
import chocolateImg from '../assets/products/chocolate.webp'
import soapImg from '../assets/products/soap.webp'
import hamImg from '../assets/products/ham.webp'
import butterImg from '../assets/products/butter.webp'
import breadImg from '../assets/products/bread.webp'
import paperImg from '../assets/products/paper.webp'
import diaperImg from '../assets/products/diaper.webp'
import fishImg from '../assets/products/fish.webp'
import chickenImg from '../assets/products/chicken.webp'
import cheeseImg from '../assets/products/cheese.webp'
import cakeImg from '../assets/products/cake.webp'
import sausageImg from '../assets/products/sausage.webp'
import sugarImg from '../assets/products/sugar.webp'
import pastaImg from '../assets/products/pasta.webp'
import cookieImg from '../assets/products/cookie.webp'
import flourImg from '../assets/products/flour.webp'
import iceCreamImg from '../assets/products/iceCream.webp'
import iceImg from '../assets/products/ice.webp'
import waterImg from '../assets/products/water.webp'
import sodaImg from '../assets/products/soda.webp'
import beerImg from '../assets/products/beer.webp'
import coffeeImg from '../assets/products/coffee.webp'
import juiceImg from '../assets/products/juice.webp'
import condimentImg from '../assets/products/condiment.webp'
import teaImg from '../assets/products/tea.webp'
import wineImg from '../assets/products/wine.webp'
import mateImg from '../assets/products/mate.webp'

export const PHOTOS: Record<string, string> = {
  apple: appleImg,
  nuggets: nuggetsImg,
  cucumber: cucumberImg,
  milk: milkImg,
  pattyRaw: pattyRawImg,
  meat: meatImg,
  cleaning: cleaningImg,
  deodorant: deodorantImg,
  oil: oilImg,
  celery: celeryImg,
  egg: eggImg,
  avocado: avocadoImg,
  tomato: tomatoImg,
  carrot: carrotImg,
  rice: riceImg,
  shampoo: shampooImg,
  banana: bananaImg,
  corn: cornImg,
  grapes: grapesImg,
  leafy: leafyImg,
  citrus: citrusImg,
  pear: pearImg,
  pineapple: pineappleImg,
  strawberry: strawberryImg,
  watermelon: watermelonImg,
  garlic: garlicImg,
  lemon: lemonImg,
  onion: onionImg,
  pepper: pepperImg,
  potato: potatoImg,
  cayenne: cayenneImg,
  asado: asadoImg,
  steak: steakImg,
  chocolate: chocolateImg,
  soap: soapImg,
  ham: hamImg,
  butter: butterImg,
  bread: breadImg,
  paper: paperImg,
  diaper: diaperImg,
  fish: fishImg,
  chicken: chickenImg,
  cheese: cheeseImg,
  cake: cakeImg,
  sausage: sausageImg,
  sugar: sugarImg,
  pasta: pastaImg,
  cookie: cookieImg,
  flour: flourImg,
  iceCream: iceCreamImg,
  ice: iceImg,
  water: waterImg,
  soda: sodaImg,
  beer: beerImg,
  coffee: coffeeImg,
  juice: juiceImg,
  condiment: condimentImg,
  tea: teaImg,
  wine: wineImg,
  mate: mateImg,
}

export const ICONS: Record<string, ReactElement> = {
  apple: (
    <>
      <path d="M12 8.5c-3 0-5 2.2-5 5.3 0 3 2 6.7 4 6.7.8 0 1-.3 1.8-.3s1 .3 1.8.3c1.9 0 3.7-3.3 3.9-5.7.1-2-1.2-3.6-2.8-4a3 3 0 0 0-3.7-2.3Z" fill="#e0433f" />
      <path d="M12.3 8.5c0-1.4.9-2.5 2-3" stroke="#5a8f3c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  citrus: (
    <>
      <circle cx="12" cy="13" r="6.5" fill="#f5a623" />
      <path d="M12 6.5v2" stroke="#5a8f3c" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  lemon: (
    <>
      <path d="M12 6.5c4 0 6.5 3 6.5 6.5S16 19.5 12 19.5 5.5 16.5 5.5 13 8 6.5 12 6.5Z" fill="#e6d84b" />
      <path d="M18.3 12.2c1-.3 1.9 0 2.2.8M5.7 13.8c-1 .3-1.9 0-2.2-.8" stroke="#c9b93a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </>
  ),
  banana: (
    <path
      d="M6 15c0 3.5 3.2 5.5 7 4.7 3.3-.7 5.6-3.3 5.5-4.7-.1-1-1-1.2-1.6-.5-1.3 1.7-3.7 3-6 3.2-2.5.2-4.2-1-4.5-3-.2-1.3.6-1.8 1.2-1.2"
      fill="#f4c542"
    />
  ),
  pear: (
    <>
      <path d="M12 20c-2.8 0-4.6-1.9-4.6-4.6 0-2.4 1.6-4 2.3-5.6.5-1.1.2-2 1-2.6.6-.5 1.2-.2 1.3.4.3-.6 1-.7 1.4-.2.6.7.1 1.5.6 2.6.8 1.6 2.6 3.3 2.6 5.4 0 2.7-1.8 4.6-4.6 4.6Z" fill="#9bc158" />
      <path d="M12 8v-.8" stroke="#5a8f3c" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  grapes: (
    <>
      {[
        [9, 10], [12, 10], [7.5, 12.5], [10.5, 12.5], [13.5, 12.5],
        [9, 15], [12, 15], [10.5, 17.3],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.7" fill="#8b5cb8" />
      ))}
      <path d="M11 8.5c0-1 .6-1.8 1.6-2" stroke="#5a8f3c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  ),
  watermelon: (
    <>
      <path d="M4 10a9 9 0 0 0 16 0Z" fill="#5a8f3c" />
      <path d="M5.6 10.8a7.3 7.3 0 0 0 12.8 0Z" fill="#e6f2df" />
      <path d="M7.2 11.4a5.7 5.7 0 0 0 9.6 0Z" fill="#e0433f" />
      <circle cx="10.5" cy="11.8" r="0.5" fill="#2c2c2c" />
      <circle cx="13.5" cy="11.8" r="0.5" fill="#2c2c2c" />
      <circle cx="12" cy="13" r="0.5" fill="#2c2c2c" />
    </>
  ),
  strawberry: (
    <>
      <path d="M12 21c-3 0-5.2-3.4-5.2-6.8 0-2.6 2.2-4.5 5.2-4.5s5.2 1.9 5.2 4.5c0 3.4-2.2 6.8-5.2 6.8Z" fill="#e0433f" />
      <path d="M9 9.5 12 11l3-1.5-1-2h-4Z" fill="#5a8f3c" />
      {[[10, 14], [14, 14], [12, 16.5], [9.5, 17], [14.5, 17]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="0.4" fill="#f7d7c4" />
      ))}
    </>
  ),
  pineapple: (
    <>
      <path d="M9 6 12 8l3-2 1 2-4 2-4-2Z" fill="#5a8f3c" />
      <ellipse cx="12" cy="15" rx="5" ry="6.5" fill="#f5a623" />
      <path d="M8.2 15h7.6" stroke="#c97e12" strokeWidth="0.9" />
    </>
  ),
  avocado: (
    <>
      <path d="M12 20.5c-3.4 0-5.7-3-5.7-6.9C6.3 9.3 8.8 5.5 12 5.5s5.7 3.8 5.7 8.1c0 3.9-2.3 6.9-5.7 6.9Z" fill="#4f7a33" />
      <path d="M12 19c-2.5 0-4.2-2.2-4.2-5.1 0-3.2 1.9-6.4 4.2-6.4s4.2 3.2 4.2 6.4c0 2.9-1.7 5.1-4.2 5.1Z" fill="#a8c96a" />
      <circle cx="12" cy="14.5" r="2.6" fill="#8a5a34" />
      <circle cx="11.1" cy="13.6" r="0.9" fill="#a97a4f" opacity="0.7" />
    </>
  ),
  tomato: (
    <>
      <circle cx="12" cy="14" r="6" fill="#e0433f" />
      <path d="M9 9.5 12 8l3 1.5-1-2h-4Z" fill="#5a8f3c" />
    </>
  ),
  potato: (
    <>
      <ellipse cx="12" cy="13.5" rx="6.2" ry="4.8" fill="#c99a5b" />
      <circle cx="9.5" cy="12.5" r="0.5" fill="#8a6a3c" />
      <circle cx="14" cy="15" r="0.5" fill="#8a6a3c" />
      <circle cx="13" cy="11.5" r="0.4" fill="#8a6a3c" />
    </>
  ),
  onion: (
    <>
      <path d="M12 20c-3.3 0-5.5-2.6-5.5-5.8 0-3.3 2.6-6.7 5.5-8.7 2.9 2 5.5 5.4 5.5 8.7 0 3.2-2.2 5.8-5.5 5.8Z" fill="#dcc7e8" />
      <path d="M11 5.5c-.4-1-.1-2 .5-2.5.6.5.9 1.5.5 2.5" fill="#9bc158" />
    </>
  ),
  carrot: (
    <>
      <path d="M12 21 8.5 10.5c-.4-1.2.7-2.3 1.9-1.9L21 12Z" fill="#f28c28" />
      <path d="M9 8.5 8 5.5M11 8 10.5 5M13 8.5l-.3-2" stroke="#5a8f3c" strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  leafy: (
    <>
      <path
        d="M7.5 19c-2.6-1.1-4.1-3.9-3.3-7.1.6-2.3 2.2-3.9 3.9-4.4.5 1.9.5 4.1 0 6-.5 2.2-1.1 4.1-.6 5.5Z"
        fill="#7fb84a"
      />
      <path
        d="M16.5 19c2.6-1.1 4.1-3.9 3.3-7.1-.6-2.3-2.2-3.9-3.9-4.4-.5 1.9-.5 4.1 0 6 .5 2.2 1.1 4.1.6 5.5Z"
        fill="#7fb84a"
      />
      <path
        d="M12 20c-2.2 0-3.8-3.2-3.3-7.2.3-2.2 1.6-4.4 3.3-5.5 1.7 1.1 3 3.3 3.3 5.5.5 4-1.1 7.2-3.3 7.2Z"
        fill="#6faa3f"
      />
      <path d="M12 19V9" stroke="#4c7a2b" strokeWidth="0.8" />
    </>
  ),
  cucumber: (
    <>
      <path
        d="M4 14.3c0-1.7 1.2-3.1 2.8-3.5l9.4-2.3c1.9-.5 3.8 1 3.8 3 0 1.6-1.1 3-2.7 3.4l-9.6 2.3c-1.9.5-3.7-1-3.7-2.9Z"
        fill="#7fae4a"
      />
      <path d="M5.8 12.6c3.5-.9 7-1.7 10.5-2.6" stroke="#5c8a38" strokeWidth="0.9" strokeLinecap="round" />
    </>
  ),
  corn: (
    <>
      <path d="M9 5.5c1.5-1.3 4.5-1.3 6 0l-1 14c-.3 2-3.7 2-4 0Z" fill="#f4c542" />
      {[9, 13].map((y, i) => (
        <path key={i} d={`M9.4 ${y} h5.2`} stroke="#e0a91a" strokeWidth="0.9" />
      ))}
      <path d="M9.5 5c-1-.7-2-.5-2.5.3M14.5 5c1-.7 2-.5 2.5.3" stroke="#5a8f3c" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </>
  ),
  garlic: (
    <>
      <path d="M12 20c-3 0-5-2-5-4.8 0-3 1.7-5.3 2.6-7.4.4-1 .1-1.8.9-2.3.5-.4 1 0 1 .6.2-.6.8-.8 1.3-.4.7.5.3 1.4.6 2.3.8 2.1 3.6 4.3 3.6 7.2 0 2.8-2 4.8-5 4.8Z" fill="#f3ede0" />
      <path d="M12 8v12" stroke="#d8cdb5" strokeWidth="0.8" />
    </>
  ),
  pepper: (
    <>
      <path d="M8 8c1.5-1.5 3-1.8 4-.8" stroke="#5a8f3c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M12 8c-3 0-4.8 2-4.8 4.6 0 4 3.2 8.4 5.6 8.4 2.6 0 4.7-2.6 4.7-5.7 0-1.9-1-3.2-2.3-3.2-.5-2.4-1.5-4.1-3.2-4.1Z" fill="#e0433f" />
    </>
  ),
  meat: (
    <>
      <path
        d="M6.5 15.2c-1.3-3 .3-6 3.3-7 .8-2.1 3-2.8 4.6-1.4 1.6 1.4 1.2 3.6-.7 4.8 2 .3 3.3 2.1 2.6 4.2-1.1 3.3-5 4-7.3 2.6-1.6-1-2.2-2-2.5-3.2Z"
        fill="#d2665a"
      />
      <circle cx="15.8" cy="10.3" r="1.5" fill="none" stroke="#f2b9ae" strokeWidth="1.1" />
    </>
  ),
  steak: (
    <>
      <path
        d="M5.5 12.5c0-3.4 3-6 6.7-6s6.3 2.4 6.3 5.6c0 3.5-3 6.4-6.8 6.4-3.4 0-6.2-2.6-6.2-6Z"
        fill="#b5473f"
      />
      <path d="M8 9.5 15 15M9 13l4.5 3.3M11.5 7.8l4.8 4.4" stroke="#8c332c" strokeWidth="1" strokeLinecap="round" />
      <path d="M6 11.5c-.6-1.4 0-2.7 1.3-3" fill="none" stroke="#e8b7a8" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  asado: (
    <>
      <path d="M5 9.5c0-1.7 1.5-2.8 3-2.3l9 3c1.6.5 2 2.5.8 3.7l-8.5 8.4c-1.2 1.2-3.2.6-3.5-1L5 9.5Z" fill="#a8483f" />
      <path d="M8 9l7 6.5M6.8 12.2l6.3 5.8" stroke="#7d332b" strokeWidth="1" strokeLinecap="round" />
      <path d="M17.5 5.5c.9.5 1.4 1.4 1.2 2.4" fill="none" stroke="#e8d9c9" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  chicken: (
    <>
      <path d="M14 6.5c2 0 3.5 1.6 3.5 3.6 0 1.6-.9 3-2.3 3.5.9 1.5.6 4-1 6.4-1 1.5-2.7 1.5-3.4.2-1-1.9-.6-4.6.6-6.6-1.4-.2-2.4-1.4-2.4-2.9 0-1.7 1.4-3.1 3.1-3.1Z" fill="#e0b382" />
      <circle cx="14.6" cy="9" r="0.5" fill="#8a6a3c" />
    </>
  ),
  fish: (
    <>
      <path d="M4 13c3-3 8-3.5 12-1.5-1 2 1 3 3 1.5-.5 3-2.5 4.5-5.5 4.5-4 0-7.5-1.5-9.5-4.5Z" fill="#6fa8c9" />
      <circle cx="8.5" cy="12" r="0.6" fill="#294b5c" />
      <path d="M8 11c-1.5-.5-3-.5-4 0 1 1 2.5 1.5 4 1.4Z" fill="#4d87a6" />
    </>
  ),
  tuna: (
    <>
      <ellipse cx="12" cy="12" rx="7" ry="4.5" fill="#c9ccd1" stroke="#a7abb2" strokeWidth="0.7" />
      <ellipse cx="12" cy="10.7" rx="7" ry="4.2" fill="#e3e5e8" stroke="#a7abb2" strokeWidth="0.7" />
      <ellipse cx="12" cy="10.7" rx="4.8" ry="2.7" fill="none" stroke="#a7abb2" strokeWidth="0.6" />
    </>
  ),
  egg: (
    <ellipse cx="12" cy="13.5" rx="4.5" ry="6" fill="#f7ecd8" stroke="#e6d6b8" strokeWidth="0.6" />
  ),
  ham: (
    <>
      <circle cx="12" cy="13" r="7" fill="#e78a94" />
      <path d="M9 9c1 1.5 1 3 0 4.5" stroke="#f4bcc4" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="13" r="7" fill="none" stroke="#d4707c" strokeWidth="1" />
    </>
  ),
  pattyRaw: (
    <>
      <ellipse cx="12" cy="17.3" rx="6.8" ry="2.3" fill="#a53a30" />
      <ellipse cx="12" cy="14.7" rx="6.8" ry="2.3" fill="#c14a3c" />
      <ellipse cx="12" cy="12.1" rx="6.8" ry="2.3" fill="#d2665a" />
    </>
  ),
  sausage: (
    <path
      d="M6 16c-1.4-1.4-1.4-4 0-5.4 3.4-3.4 9-3.4 12 0 1.4 1.4 1.4 4 0 5.4-3.4 3.4-9 3.4-12 0Z"
      fill="#c9695a"
    />
  ),
  milk: (
    <>
      <path d="M9.5 4h5v3l1.5 2.5v9c0 1-.8 1.8-1.8 1.8h-4.4C8.8 20.3 8 19.5 8 18.5v-9L9.5 7Z" fill="#f5f5f5" stroke="#d8d8d8" strokeWidth="0.6" />
      <rect x="8" y="12" width="8" height="3" fill="#6fa8c9" />
    </>
  ),
  cheese: (
    <>
      <path d="M4 17 12 6l8 11Z" fill="#f5c542" />
      <circle cx="11" cy="14.5" r="0.7" fill="#e0a91a" />
      <circle cx="14.5" cy="15.5" r="0.5" fill="#e0a91a" />
    </>
  ),
  butter: (
    <>
      <rect x="8.5" y="7" width="10" height="11" rx="1" fill="#f7d95c" stroke="#e0bd2e" strokeWidth="0.6" />
      <path d="M8.5 7 4 5v14l4.5-2Z" fill="#fdf6e0" stroke="#e6dcc0" strokeWidth="0.6" />
    </>
  ),
  bread: (
    <path
      d="M4.5 15c0-4.5 3.4-7.5 7.5-7.5s7.5 3 7.5 7.5c0 1.7-1.3 2.5-3 2.5H7.5c-1.7 0-3-.8-3-2.5Z"
      fill="#d9a45f"
    />
  ),
  pastry: (
    <path
      d="M4 15c1-3 4-5.5 8-5.5s7 2.5 8 5.5c-2-1-4.5-1.5-8-1.5s-6 .5-8 1.5Z"
      fill="#e0b56a"
    />
  ),
  cookie: (
    <>
      <circle cx="12" cy="13" r="7" fill="#d9a45f" />
      <circle cx="9.5" cy="11" r="0.8" fill="#7a4a24" />
      <circle cx="14" cy="10.5" r="0.8" fill="#7a4a24" />
      <circle cx="13.5" cy="15" r="0.8" fill="#7a4a24" />
      <circle cx="10" cy="15.5" r="0.8" fill="#7a4a24" />
    </>
  ),
  cake: (
    <path d="M12 6 18 18H6Z" fill="#f2a6c1" stroke="#e07fa8" strokeWidth="0.6" />
  ),
  rice: (
    <>
      <path d="M4.5 15.5c0-1 .9-1.7 2-1.7h11c1.1 0 2 .7 2 1.7 0 2.8-3.4 4.7-7.5 4.7s-7.5-1.9-7.5-4.7Z" fill="#e9e4d3" />
      <path d="M6 13.8c.2-4 3-6.8 6-6.8s5.8 2.8 6 6.8Z" fill="#f7f4ea" stroke="#e3ddc8" strokeWidth="0.5" />
    </>
  ),
  pasta: (
    <path
      d="M6 8c3 0 3 3 6 3s3-3 6-3M6 12.5c3 0 3 3 6 3s3-3 6-3M6 17c3 0 3 2.5 6 2.5s3-2.5 6-2.5"
      stroke="#f4c542"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
  ),
  flour: (
    <>
      <path d="M6.5 8h11l1 10.5c0 .8-.7 1.5-1.5 1.5h-10c-.8 0-1.5-.7-1.5-1.5Z" fill="#f7f3e8" stroke="#ddd6c0" strokeWidth="0.6" />
      <path d="M6.5 8 7 6h10l.5 2Z" fill="#e8dfc8" stroke="#ddd6c0" strokeWidth="0.5" />
      <rect x="8.5" y="12" width="7" height="2.2" rx="0.4" fill="#c94f4f" opacity="0.85" />
    </>
  ),
  salt: (
    <>
      <path
        d="M12 4c.6 0 1 .5 1 1.1v1.3c2.6.6 4 2.9 4 5.8v6.3c0 1.4-1.1 2.5-2.5 2.5h-5C8.1 21 7 19.9 7 18.5v-6.3c0-2.9 1.4-5.2 4-5.8V5.1c0-.6.4-1.1 1-1.1Z"
        fill="#f2f2f2"
        stroke="#dcdcdc"
        strokeWidth="0.6"
      />
      <path d="M10.3 6.8c.5 1 .9 1 1.7 1s1.2 0 1.7-1" stroke="#c9c3ac" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </>
  ),
  sugar: (
    <>
      <path
        d="M6.5 8.5 12 5l5.5 3.5v8L12 20l-5.5-3.5Z"
        fill="#f7efd8"
        stroke="#e4d6a8"
        strokeWidth="0.6"
      />
      <path d="M8 9.3 12 11.7l4-2.4M12 11.7V19" stroke="#e4d6a8" strokeWidth="0.7" fill="none" strokeLinecap="round" />
    </>
  ),
  condiment: (
    <path
      d="M10 4h4v2.5c1.5.5 2.5 2 2.5 3.7V19c0 .8-.7 1.5-1.5 1.5h-6c-.8 0-1.5-.7-1.5-1.5v-8.8c0-1.7 1-3.2 2.5-3.7Z"
      fill="#e0433f"
    />
  ),
  oil: (
    <>
      <path d="M10 3h4v3l2 2v11c0 .8-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.7-1.5-1.5V8l2-2Z" fill="#d9a01f" fillOpacity="0.85" />
      <rect x="9" y="12" width="6" height="6.5" fill="#c48c15" />
    </>
  ),
  coffee: (
    <>
      <path d="M6 11h10v5c0 2.2-1.8 4-4 4h-2c-2.2 0-4-1.8-4-4Z" fill="#7a4a24" />
      <path d="M16 12.5h1.5c1.1 0 2 .9 2 2s-.9 2-2 2H16" fill="none" stroke="#7a4a24" strokeWidth="1.3" />
      <path
        d="M9 9c-.6-.8 0-1.3.4-1.9M12.5 9c-.6-.8 0-1.3.4-1.9"
        stroke="#c9a27a"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  tea: (
    <>
      <path d="M6 11h9v4.5c0 2-1.6 3.5-3.5 3.5h-2C7.6 19 6 17.5 6 15.5Z" fill="#c7dba3" />
      <path d="M15 12.5h1.3c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8H15" fill="none" stroke="#8fae5c" strokeWidth="1.2" />
      <path d="M9.5 11V7.5l2.2 1.3 2.3-1.3V11" stroke="#6f8f45" strokeWidth="0.8" fill="none" strokeLinejoin="round" />
      <rect x="12.6" y="5.5" width="2" height="1.6" rx="0.3" fill="#e8b84b" />
    </>
  ),
  mate: (
    <>
      <path d="M8.5 12c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5v3c0 2.2-1.6 4-3.5 4s-3.5-1.8-3.5-4Z" fill="#8fae5c" />
      <path d="M13 8.5 16 5.5" stroke="#b0b0b0" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  water: (
    <path
      d="M12 4c2.8 3.6 5 7 5 9.8a5 5 0 0 1-10 0C7 11 9.2 7.6 12 4Z"
      fill="#5fb3e0"
    />
  ),
  soda: (
    <>
      <path
        d="M10.5 3h3v2.3c1.2.4 2 1.5 2 2.8v10.6c0 .8-.7 1.5-1.5 1.5h-4c-.8 0-1.5-.7-1.5-1.5V8.1c0-1.3.8-2.4 2-2.8Z"
        fill="#e0433f"
      />
      <rect x="10" y="2" width="4" height="1.6" rx="0.5" fill="#8a2a26" />
    </>
  ),
  juice: (
    <>
      <path d="M7.5 8.5 9 5.5h6l1.5 3Z" fill="#e0761b" />
      <path d="M7.5 8.5h9V18c0 .8-.7 1.5-1.5 1.5h-6c-.8 0-1.5-.7-1.5-1.5Z" fill="#f28c28" />
    </>
  ),
  beer: (
    <>
      <path d="M7.5 9h7v9.5c0 .8-.7 1.5-1.5 1.5H9c-.8 0-1.5-.7-1.5-1.5Z" fill="#f2b93c" />
      <path d="M8 9c0-1.5-.5-2.5.5-3.5" stroke="#e0a91a" strokeWidth="1" fill="none" />
      <ellipse cx="11" cy="9" rx="3.5" ry="1.3" fill="#f5f5f0" />
    </>
  ),
  wine: (
    <>
      <path d="M8.5 5h7c0 4-1.2 6.5-3.5 7v5h2.5v1.5h-6.5V17H10v-5c-2.3-.5-3.5-3-3.5-7Z" fill="#7a3b6e" />
    </>
  ),
  chocolate: (
    <>
      <rect x="5" y="8" width="14" height="9" rx="1" fill="#7a4a24" />
      <path d="M12 8v9M8.3 8v9M15.7 8v9M5 12.5h14" stroke="#5c3419" strokeWidth="0.8" />
    </>
  ),
  iceCream: (
    <>
      <circle cx="12" cy="9.5" r="4" fill="#f2a6c1" />
      <path d="M8.5 11 12 20l3.5-9Z" fill="#e0b56a" />
    </>
  ),
  ice: (
    <>
      <path d="M12 4 19 8v8l-7 4-7-4V8Z" fill="#cdeaf7" stroke="#9fd3ea" strokeWidth="0.6" />
      <path d="M12 4v8M5 8l7 4 7-4" stroke="#9fd3ea" strokeWidth="0.6" fill="none" />
      <path d="M9 9 11.2 10.2v3l-2.2-1.2Z" fill="#ffffff" opacity="0.75" />
    </>
  ),
  cleaning: (
    <>
      <rect x="9" y="9" width="6" height="10" rx="1" fill="#5fb3e0" />
      <rect x="10" y="5" width="4" height="4" rx="0.6" fill="#3f8cbf" />
      <path d="M14 6.5h2.3c.6 0 1 .4 1 1s-.4 1-1 1H14" fill="none" stroke="#3f8cbf" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  bleach: (
    <>
      <rect x="9" y="9" width="6" height="10" rx="1" fill="#eef1f4" stroke="#c3cad1" strokeWidth="0.8" />
      <rect x="10" y="5" width="4" height="4" rx="0.6" fill="#e0433f" />
      <path d="M10.2 12h3.6M10.2 14.3h3.6M10.2 16.6h2.4" stroke="#c3cad1" strokeWidth="0.9" strokeLinecap="round" />
    </>
  ),
  soap: (
    <>
      <rect x="5.5" y="10" width="13" height="7.5" rx="3" fill="#f6d9c4" />
      <path d="M8.5 13.7c1.8 1 5.2 1 7 0" fill="none" stroke="#e3b291" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  shampoo: (
    <path d="M9.5 5h5v2.5c1 .4 1.5 1.2 1.5 2.3V19c0 .8-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.7-1.5-1.5V9.8c0-1.1.5-1.9 1.5-2.3Z" fill="#a875c9" />
  ),
  deodorant: (
    <>
      <rect x="8.5" y="9" width="7" height="10.5" rx="2.5" fill="#5fb3e0" />
      <rect x="9.3" y="6" width="5.4" height="3.6" rx="1" fill="#3f8cbf" />
      <rect x="9.8" y="4.5" width="4.4" height="1.8" rx="0.7" fill="#2c6f9e" />
    </>
  ),
  paper: (
    <>
      <rect x="7" y="6" width="10" height="12" rx="5" fill="#f5f5f0" stroke="#dcdcd2" strokeWidth="0.7" />
      <ellipse cx="12" cy="6" rx="5" ry="2" fill="#e8e8de" />
    </>
  ),
  diaper: (
    <>
      <path d="M4.5 8.5h15c0 4.7-2.3 9.5-7.5 9.5s-7.5-4.8-7.5-9.5Z" fill="#bfe3f2" />
      <path
        d="M4.5 8.5c0-1.1.6-1.7 1.7-1.7h11.6c1.1 0 1.7.6 1.7 1.7"
        fill="none"
        stroke="#9cc9dd"
        strokeWidth="0.9"
      />
      <rect x="2.8" y="7.3" width="2.6" height="3.2" rx="1.1" fill="#f2a6c1" />
      <rect x="18.6" y="7.3" width="2.6" height="3.2" rx="1.1" fill="#f2a6c1" />
    </>
  ),
}

// Todas las claves de ilustración disponibles (dibujadas o con foto real),
// para el selector de ícono al crear/editar un producto del catálogo.
export const ALL_ICON_KEYS = [...new Set([...Object.keys(ICONS), ...Object.keys(PHOTOS)])].sort()
