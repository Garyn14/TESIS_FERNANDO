package pe.drasatipo.plataforma.documentos;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import pe.drasatipo.plataforma.comun.ReglaDeNegocioException;

/**
 * Plantilla Excel de la relación de beneficiarios y lectura del archivo importado (HU09, RF14). El
 * archivo se lee en memoria y no se guarda.
 */
@Component
public class ExcelDeBeneficiarios {

  static final List<String> COLUMNAS = List.of("Nombres", "Apellidos", "DNI");

  /** Archivo .xlsx con los encabezados y la columna DNI como texto, para no perder ceros. */
  public byte[] plantilla() {
    try (Workbook libro = new XSSFWorkbook();
        ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
      Sheet hoja = libro.createSheet("Beneficiarios");
      Font negrita = libro.createFont();
      negrita.setBold(true);
      CellStyle encabezado = libro.createCellStyle();
      encabezado.setFont(negrita);
      CellStyle texto = libro.createCellStyle();
      texto.setDataFormat(libro.createDataFormat().getFormat("@"));

      Row fila = hoja.createRow(0);
      for (int i = 0; i < COLUMNAS.size(); i++) {
        Cell celda = fila.createCell(i);
        celda.setCellValue(COLUMNAS.get(i));
        celda.setCellStyle(encabezado);
        hoja.setColumnWidth(i, (i == 2 ? 14 : 30) * 256);
      }
      hoja.setDefaultColumnStyle(2, texto);
      hoja.createFreezePane(0, 1);
      libro.write(salida);
      return salida.toByteArray();
    } catch (IOException e) {
      throw new IllegalStateException("No se pudo generar la plantilla", e);
    }
  }

  /**
   * Filas del archivo, sin validarlas: la validación es la misma del registro manual. Las filas
   * vacías se ignoran.
   */
  public List<Beneficiario> leer(InputStream archivo) {
    try (Workbook libro = new XSSFWorkbook(archivo)) {
      Sheet hoja = libro.getSheetAt(0);
      DataFormatter formato = new DataFormatter(Locale.ROOT);
      int[] columnas = columnas(hoja.getRow(hoja.getFirstRowNum()), formato);

      List<Beneficiario> filas = new ArrayList<>();
      for (int i = hoja.getFirstRowNum() + 1; i <= hoja.getLastRowNum(); i++) {
        Row fila = hoja.getRow(i);
        if (fila == null) {
          continue;
        }
        String nombres = valor(fila, columnas[0], formato);
        String apellidos = valor(fila, columnas[1], formato);
        String dni = valor(fila, columnas[2], formato);
        if (nombres.isEmpty() && apellidos.isEmpty() && dni.isEmpty()) {
          continue;
        }
        filas.add(new Beneficiario(nombres, apellidos, dni));
        if (filas.size() > ValidacionDeLote.MAXIMO) {
          throw invalido(
              "El archivo tiene más de %d beneficiarios. Divida la lista en varios lotes."
                  .formatted(ValidacionDeLote.MAXIMO));
        }
      }
      if (filas.isEmpty()) {
        throw invalido("El archivo no tiene beneficiarios.");
      }
      return filas;
    } catch (ReglaDeNegocioException e) {
      throw e;
    } catch (IOException | RuntimeException e) {
      // Otro formato (CSV, .xls, una imagen...) o un .xlsx dañado.
      throw invalido("El archivo no es una plantilla Excel (.xlsx). Use la plantilla descargada.");
    }
  }

  /** Posición de cada columna de la plantilla en la fila de encabezados. */
  private static int[] columnas(Row encabezados, DataFormatter formato) {
    int[] posiciones = {-1, -1, -1};
    if (encabezados != null) {
      for (Cell celda : encabezados) {
        int indice =
            COLUMNAS.stream()
                .map(ExcelDeBeneficiarios::clave)
                .toList()
                .indexOf(clave(formato.formatCellValue(celda)));
        if (indice >= 0 && posiciones[indice] < 0) {
          posiciones[indice] = celda.getColumnIndex();
        }
      }
    }
    for (int posicion : posiciones) {
      if (posicion < 0) {
        throw invalido(
            "El archivo no tiene las columnas Nombres, Apellidos y DNI de la plantilla.");
      }
    }
    return posiciones;
  }

  private static String valor(Row fila, int columna, DataFormatter formato) {
    Cell celda = fila.getCell(columna);
    return celda == null ? "" : formato.formatCellValue(celda).strip();
  }

  /** Encabezado sin tildes, mayúsculas ni espacios extra: "DNI ", "nombres" y "Nómbres" valen. */
  private static String clave(String texto) {
    return Normalizer.normalize(texto.strip(), Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT);
  }

  private static ReglaDeNegocioException invalido(String mensaje) {
    return new ReglaDeNegocioException(HttpStatus.BAD_REQUEST, "archivo", mensaje);
  }
}
