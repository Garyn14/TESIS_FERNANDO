package pe.drasatipo.plataforma.comun;

/**
 * Ayudas de texto sin expresiones regulares (DRA-81): quitar un carácter repetido de los extremos
 * con una expresión como {@code "/+$"} puede tardar mucho con textos largos (retroceso).
 */
public final class Textos {

  private Textos() {}

  /** El texto sin las repeticiones de {@code caracter} al final: "http://x//" → "http://x". */
  public static String sinFinal(String texto, char caracter) {
    int fin = texto.length();
    while (fin > 0 && texto.charAt(fin - 1) == caracter) {
      fin--;
    }
    return texto.substring(0, fin);
  }

  /** El texto sin las repeticiones de {@code caracter} al inicio ni al final: "__A_B__" → "A_B". */
  public static String sinExtremos(String texto, char caracter) {
    String sinFinal = sinFinal(texto, caracter);
    int inicio = 0;
    while (inicio < sinFinal.length() && sinFinal.charAt(inicio) == caracter) {
      inicio++;
    }
    return sinFinal.substring(inicio);
  }
}
