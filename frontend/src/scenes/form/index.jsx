import { Box, Button, TextField } from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../../components/Header";
import LocationPicker from "../../components/LocationPicker/index";

const Form = () => {
  const isNonMobile = useMediaQuery("(min-width:600px)");

  const handleFormSubmit = async (values, { setSubmitting, resetForm, setFieldError }) => {
    console.log('🟢 handleFormSubmit appelé avec les valeurs:', values);

    // Vérification si la date d'installation est dans le passé
    const today = new Date();
    const selectedDate = new Date(values.installationDate);
    if (selectedDate < today) {
      alert("La date d'installation ne peut pas être dans le passé. Veuillez sélectionner une date valide.");
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('jwt'); // Récupérer le token d'authentification
      
      if (!token) {
        console.error('❌ Aucun token trouvé. Redirection vers la page de connexion...');
        window.location.href = '/login';
        return;
      }
      
      console.log('🔍 Token envoyé:', token);
      console.log('🔍 Données envoyées:', {
        name: values.name,
        cin: values.cin,
        email: values.email,
        address: values.address,
        installationDate: values.installationDate,
        latitude: values.latitude,
        longitude: values.longitude,
        elevation: values.elevation
      });
      
      const response = await fetch('http://localhost:3001/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: values.name,
          cin: values.cin,
          email: values.email,
          address: values.address,
          installationDate: values.installationDate,
          latitude: values.latitude,
          longitude: values.longitude,
          elevation: values.elevation
        })
      });

      const data = await response.json().catch(() => {
        console.error('❌ Réponse non JSON:', response.status, response.statusText);
        throw new Error('Réponse non JSON reçue du serveur');
      });

      if (!response.ok) {
        console.error('❌ Erreur de réponse:', response.status, response.statusText);
        throw new Error(data.error || 'Erreur inconnue');
      }

      // Réinitialiser le formulaire si l'ajout est réussi
      resetForm();
      
      // Afficher un message de succès (vous pouvez utiliser une notification toast ici)
      alert('Client ajouté avec succès!');
      
    } catch (error) {
      console.error('Erreur:', error);
      // Si l'erreur concerne le CIN déjà existant
      if (error.message.includes('CIN existe déjà')) {
        setFieldError('cin', 'Un client avec ce CIN existe déjà');
      } else {
        alert(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutSchema = yup.object().shape({
    name: yup.string().required("Nom complet requis"),
    cin: yup.string()
      .required("Numéro CIN requis")
      .matches(/^\d{8}$/, "Le CIN doit contenir 8 chiffres"),
    email: yup.string()
      .email("Email invalide")
      .required("Email requis"),
    installationDate: yup.date()
      .nullable()
      .min(new Date(), "La date d'installation ne peut pas être dans le passé"), // Validation pour empêcher les dates passées
    latitude: yup.number().required("Veuillez sélectionner un emplacement sur la carte"),
    longitude: yup.number().required("Veuillez sélectionner un emplacement sur la carte"),
    elevation: yup.number().nullable(),
    address: yup.string().required("L'adresse sera automatiquement récupérée en cliquant sur la carte")
  });

  const initialValues = {
    name: "",
    cin: "",
    email: "",
    address: "",
    installationDate: "",
    status: "en attente",
    latitude: null,
    longitude: null,
    elevation: null
  };

  return (
    <Box m="20px">
      <Header title="AJOUTER CLIENT" subtitle="Ajouter un nouveau client PV" />

      <Formik
        enableReinitialize
        onSubmit={handleFormSubmit}
        initialValues={initialValues}
        validationSchema={checkoutSchema}
      >
        {({
          values,
          errors,
          touched,
          handleBlur,
          handleChange,
          handleSubmit,
        }) => (
          <form onSubmit={handleSubmit}>
            <Box
              display="grid"
              gap="30px"
              gridTemplateColumns="repeat(4, minmax(0, 1fr))"
              sx={{
                "& > div": { gridColumn: isNonMobile ? undefined : "span 4" },
              }}
            >
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Nom Complet"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.name}
                name="name"
                error={!!touched.name && !!errors.name}
                helperText={touched.name && errors.name}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Numéro CIN"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.cin}
                name="cin"
                error={!!touched.cin && !!errors.cin}
                helperText={touched.cin && errors.cin}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="email"
                label="Email"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.email}
                name="email"
                error={!!touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="date"
                label="Date d'installation prévue"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.installationDate}
                name="installationDate"
                InputLabelProps={{ shrink: true }}
                sx={{ gridColumn: "span 4" }}
              />

              <Box sx={{ gridColumn: "span 4" }}>
                <LocationPicker 
                  onLocationSelect={(location) => {
                    handleChange({
                      target: {
                        name: 'latitude',
                        value: location.latitude
                      }
                    });
                    handleChange({
                      target: {
                        name: 'longitude',
                        value: location.longitude
                      }
                    });
                    handleChange({
                      target: {
                        name: 'elevation',
                        value: location.elevation
                      }
                    });
                    handleChange({
                      target: {
                        name: 'address',
                        value: location.address
                      }
                    });
                  }}
                />
                
                <Box
                  display="grid"
                  gap="20px"
                  gridTemplateColumns="repeat(4, 1fr)"
                  sx={{ mt: 2 }}
                >
                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Adresse"
                    value={values.address}
                    name="address"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{ gridColumn: "span 4" }}
                  />
                  
                  <TextField
                    fullWidth
                    variant="filled"
                    type="number"
                    label="Latitude"
                    value={values.latitude || ''}
                    name="latitude"
                    InputProps={{
                      readOnly: true,
                      endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>°</Box>
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    variant="filled"
                    type="number"
                    label="Longitude"
                    value={values.longitude || ''}
                    name="longitude"
                    InputProps={{
                      readOnly: true,
                      endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>°</Box>
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    variant="filled"
                    type="number"
                    label="Altitude"
                    value={values.elevation || ''}
                    name="elevation"
                    InputProps={{
                      readOnly: true,
                      endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>m</Box>
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <Box display="flex" justifyContent="end" mt="20px">
              <Button type="submit" color="secondary" variant="contained">
                Ajouter Client
              </Button>
            </Box>
          </form>
        )}
      </Formik>
    </Box>
  );
};

export default Form;
