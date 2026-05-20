/**
 * MARGIN — the only six values that exist in this app.
 * If you reach for any other color, you are solving the wrong problem.
 */

export interface ColorPalette {
  ink: string;
  paper: string;
  fog: string;
  ash: string;
  shadow: string;
  void: string;
}

export const lightColors: ColorPalette = {
  ink: '#0A0A0A',
  paper: '#F8F6F1',
  fog: '#E8E5DE',
  ash: '#8C8A85',
  shadow: '#2A2826',
  void: '#000000',
};

export const darkColors: ColorPalette = {
  ink: '#EDEAE3',
  paper: '#0F0E0C',
  fog: '#26241F',
  ash: '#6F6D68',
  shadow: '#D6D2C9',
  void: '#000000',
};
