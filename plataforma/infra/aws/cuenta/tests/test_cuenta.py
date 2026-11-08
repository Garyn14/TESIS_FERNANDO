"""Pruebas de la plantilla de la cuenta (DRA-53), sin AWS: fijan las decisiones de seguridad y de
costo que no deben cambiar por descuido.   python3 -m unittest discover -s tests"""

import unittest
from pathlib import Path

from cfnlint.decode import decode

PLANTILLA, errores = decode(str(Path(__file__).parent.parent / "cuenta.yml"))
assert not errores, errores
RECURSOS = PLANTILLA["Resources"]


def declaraciones(politica):
    return politica["PolicyDocument"]["Statement"]


class Acceso(unittest.TestCase):
    def setUp(self):
        self.rol = RECURSOS["RolGitHub"]["Properties"]
        self.confianza = self.rol["AssumeRolePolicyDocument"]["Statement"]

    def test_solo_el_ambiente_qa_de_este_repositorio(self):
        (declaracion,) = self.confianza
        condicion = declaracion["Condition"]["StringEquals"]
        self.assertEqual(condicion["token.actions.githubusercontent.com:aud"], "sts.amazonaws.com")
        sub = condicion["token.actions.githubusercontent.com:sub"]
        self.assertEqual(sub, {"Fn::Sub": "repo:${Repositorio}:environment:${AmbienteGitHub}"})
        self.assertNotIn("StringLike", declaracion["Condition"], "sin comodines en el sujeto")
        self.assertEqual(PLANTILLA["Parameters"]["Repositorio"]["Default"], "Garyn14/TESIS_FERNANDO")
        self.assertEqual(PLANTILLA["Parameters"]["AmbienteGitHub"]["Default"], "qa")

    def test_sesiones_cortas_y_sin_administrador(self):
        self.assertEqual(self.rol["MaxSessionDuration"], 3600)
        administradas = [p["Fn::Sub"] for p in self.rol["ManagedPolicyArns"]]
        self.assertEqual(administradas, ["arn:${AWS::Partition}:iam::aws:policy/PowerUserAccess"])

    def test_iam_limitado_al_rol_del_servidor(self):
        (politica,) = self.rol["Policies"]
        for declaracion in declaraciones(politica):
            recursos = declaracion["Resource"]
            recursos = recursos if isinstance(recursos, list) else [recursos]
            for recurso in recursos:
                arn = recurso["Fn::Sub"]
                self.assertTrue(
                    arn.endswith("dra-satipo-*-servidor") or arn.endswith(":policy/*"),
                    f"{declaracion['Sid']}: {arn}",
                )
            acciones = declaracion["Action"]
            self.assertNotIn("iam:*", acciones)
            self.assertNotIn("iam:UpdateAssumeRolePolicy", acciones)

    def test_solo_se_adjunta_la_politica_de_ssm_y_solo_a_ec2(self):
        (politica,) = self.rol["Policies"]
        por_sid = {d["Sid"]: d for d in declaraciones(politica)}
        adjuntar = por_sid["SoloLaPoliticaDeSsm"]["Condition"]["ArnEquals"]["iam:PolicyARN"]
        self.assertTrue(adjuntar["Fn::Sub"].endswith(":policy/AmazonSSMManagedInstanceCore"))
        entregar = por_sid["EntregarElRolAlServidor"]["Condition"]["StringEquals"]
        self.assertEqual(entregar["iam:PassedToService"], "ec2.amazonaws.com")


class EstadoDeTerraform(unittest.TestCase):
    def test_privado_cifrado_con_versiones_y_conservado(self):
        bucket = RECURSOS["BucketEstado"]
        self.assertEqual(bucket["DeletionPolicy"], "Retain")
        p = bucket["Properties"]
        self.assertEqual(p["VersioningConfiguration"]["Status"], "Enabled")
        self.assertTrue(all(p["PublicAccessBlockConfiguration"].values()))
        self.assertIn("ServerSideEncryptionConfiguration", p["BucketEncryption"])

    def test_solo_https(self):
        (declaracion,) = declaraciones(RECURSOS["PoliticaBucketEstado"]["Properties"])
        self.assertEqual(declaracion["Effect"], "Deny")
        self.assertEqual(declaracion["Condition"]["Bool"]["aws:SecureTransport"], "false")


class Presupuesto(unittest.TestCase):
    def setUp(self):
        self.p = RECURSOS["Presupuesto"]["Properties"]

    def test_los_creditos_no_esconden_el_gasto(self):
        self.assertIs(self.p["Budget"]["CostTypes"]["IncludeCredit"], False)

    def test_avisos_a_10_25_y_50_y_pronostico_sobre_25(self):
        avisos = sorted(
            (n["Notification"]["NotificationType"], n["Notification"]["Threshold"])
            for n in self.p["NotificationsWithSubscribers"]
        )
        self.assertEqual(avisos, [("ACTUAL", 10), ("ACTUAL", 25), ("ACTUAL", 50), ("FORECASTED", 25)])
        for n in self.p["NotificationsWithSubscribers"]:
            self.assertEqual(n["Notification"]["ThresholdType"], "ABSOLUTE_VALUE")
            self.assertEqual(n["Subscribers"], [{"SubscriptionType": "EMAIL", "Address": {"Ref": "CorreoAlertas"}}])

    def test_mensual(self):
        self.assertEqual(self.p["Budget"]["TimeUnit"], "MONTHLY")


class Salidas(unittest.TestCase):
    def test_entrega_lo_que_se_copia_en_github(self):
        self.assertEqual(set(PLANTILLA["Outputs"]), {"RolGitHub", "BucketEstado"})


if __name__ == "__main__":
    unittest.main()
